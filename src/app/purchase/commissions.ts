import { Purchase } from "./model";
import { Wallet, TransactionLog } from "../wallet/model";
import { User } from "../user/model";
import { recalcUserRank } from "../rank/controller";
import { CompanyLedger } from "../ledger/model";

// M-10 fix: removed conflicting $setOnInsert + $inc on same fields.
// Use a two-step upsert: ensure wallet exists first, then $inc atomically.
const atomicCreditWallet = async (
  userId: string,
  field:
    | "directCommissionBalance"
    | "manCommFromDownPayment"
    | "manCommFromInstallment",
  amount: number
) => {
  // Ensure wallet document exists (no-op if already exists)
  await Wallet.findOneAndUpdate(
    { userId },
    {
      $setOnInsert: {
        userId,
        totalBalance: 0,
        directCommissionBalance: 0,
        manCommFromDownPayment: 0,
        manCommFromInstallment: 0,
        salaryBalanceFromRanks: 0,
        cashbackBalance: 0,
        transferBalance: 0,
      },
    },
    { upsert: true }
  );
  // Then atomically increment — no conflict with $setOnInsert
  const wallet = await Wallet.findOneAndUpdate(
    { userId },
    { $inc: { [field]: amount, totalBalance: amount } },
    { new: true }
  );
  if (!wallet)
    throw new Error(`Wallet not found for userId=${userId} after upsert`);
  return wallet;
};

const ledgerCommission = async (
  txId: any,
  userId: string,
  amount: number,
  note: string
) => {
  try {
    await CompanyLedger.create({
      date: new Date(),
      type: "commission_paid",
      amount,
      relatedId: txId,
      relatedModel: "TransactionLog",
      userId,
      note,
    });
  } catch (err) {
    // Log ledger failure — financial audit trail must be preserved
    console.error(
      `[LEDGER ERROR] Failed to create commission ledger for userId=${userId}, amount=${amount}:`,
      err
    );
  }
};

export const distributeCommissions = async (purchaseId: string) => {
  try {
    const purchase = await Purchase.findOneAndUpdate(
      { _id: purchaseId, commissionProcessed: false },
      { $set: { commissionProcessed: true } },
      { new: true }
    ).populate("projectId");

    if (!purchase) return;

    const snap = purchase.snapshot;
    if (!snap) return;

    const buyer = await User.findById(purchase.userId).select(
      "generationAncestors name username"
    );
    if (!buyer) return;

    // C-04 fix: load Settings once and pass to all recalcUserRank calls
    const { Settings } = await import("../settings/model");
    const settingsDoc = await Settings.findOne();
    const preloadedRanks = (settingsDoc?.ranks ?? []) as any[];

    const buyerName = (buyer as any).name ?? "";
    const buyerUsername = (buyer as any).username ?? "";
    const shareTitle = snap.shareTitle ?? "";
    const qty = purchase.quantity;
    const payType = purchase.paymentType === "cash" ? "Cash" : "Installment";

    const referrerId = buyer.generationAncestors[0]?.userId ?? null;

    let downPaymentPortion: number;
    let installmentPortion: number;

    if (purchase.paymentType === "cash") {
      downPaymentPortion = Math.min(snap.maxDownPayment, snap.cashPrice) * qty;
      installmentPortion =
        Math.max(0, snap.cashPrice - snap.maxDownPayment) * qty;
    } else {
      downPaymentPortion = purchase.amountPaid;
      installmentPortion = 0;
    }

    // ── 1. Direct Sale Commission ─────────────────────────────────────────────
    if (referrerId) {
      const commission =
        (snap.directSaleCommissionValue / 100) * downPaymentPortion;
      if (commission > 0) {
        const wallet = await atomicCreditWallet(
          referrerId.toString(),
          "directCommissionBalance",
          commission
        );
        const note = `Direct sale commission (${
          snap.directSaleCommissionValue
        }% of ৳${downPaymentPortion.toLocaleString()}) — Buyer: ${buyerName} (@${buyerUsername}), Share: ${shareTitle} x${qty} [${payType}]`;
        const tx = await TransactionLog.create({
          userId: referrerId,
          type: "direct_commission",
          amount: commission,
          balanceAfter: wallet.directCommissionBalance,
          relatedPurchaseId: purchase._id,
          note,
        });
        await ledgerCommission(tx._id, referrerId.toString(), commission, note);
      }
      await User.findByIdAndUpdate(referrerId, {
        $inc: { directSalesCount: qty },
      });
      await recalcUserRank(referrerId.toString(), preloadedRanks); // C-04 fix
    }

    // ── 2. Down Payment Managerial Commission ─────────────────────────────────
    if (downPaymentPortion > 0) {
      const maxGen = snap.downPaymentGenerationRates.length;
      for (let gen = 1; gen <= maxGen; gen++) {
        const ancestor = buyer.generationAncestors.find(
          (a: any) => a.level === gen
        );
        if (!ancestor) break;
        const currentId = ancestor.userId.toString();

        const genConfig = snap.downPaymentGenerationRates.find(
          (g) => g.generation === gen
        );
        if (genConfig && genConfig.rate > 0) {
          const commission = (genConfig.rate / 100) * downPaymentPortion;
          const wallet = await atomicCreditWallet(
            currentId,
            "manCommFromDownPayment",
            commission
          );
          const note = `Gen ${gen} managerial commission — DP (${
            genConfig.rate
          }% of ৳${downPaymentPortion.toLocaleString()}) — Buyer: ${buyerName} (@${buyerUsername}), Share: ${shareTitle} x${qty}`;
          const tx = await TransactionLog.create({
            userId: currentId,
            type: "managerial_commission",
            amount: commission,
            balanceAfter: wallet.manCommFromDownPayment,
            relatedPurchaseId: purchase._id,
            note,
          });
          await ledgerCommission(tx._id, currentId, commission, note);
        }
        await User.findByIdAndUpdate(currentId, {
          $inc: { teamSalesCount: qty },
        });
        await recalcUserRank(currentId, preloadedRanks); // C-04 fix
      }
    }

    // ── 3. Installment Portion Managerial Commission ──────────────────────────
    // Uses per-generation rates from snap.installmentGenerationRates.
    // Falls back to the legacy flat snap.installmentCommissionRate for old records
    // that were created before the per-gen array was introduced.
    if (installmentPortion > 0) {
      const instGenRates: { generation: number; rate: number }[] =
        snap.installmentGenerationRates &&
        snap.installmentGenerationRates.length > 0
          ? snap.installmentGenerationRates
          : [];

      // Legacy flat-rate fallback: build a synthetic per-gen array where every gen
      // shares the same rate (old behaviour), but only when the new array is absent.
      const effectiveRates =
        instGenRates.length > 0
          ? instGenRates
          : snap.installmentCommissionRate > 0
          ? snap.downPaymentGenerationRates.map((g) => ({
              generation: g.generation,
              rate: snap.installmentCommissionRate,
            }))
          : [];

      if (effectiveRates.length > 0) {
        const maxGen = effectiveRates.length;
        for (let gen = 1; gen <= maxGen; gen++) {
          const ancestor = buyer.generationAncestors.find(
            (a: any) => a.level === gen
          );
          if (!ancestor) break;
          const currentId = ancestor.userId.toString();

          const genConfig = effectiveRates.find((g) => g.generation === gen);
          if (!genConfig || genConfig.rate <= 0) continue;

          const commission = (genConfig.rate / 100) * installmentPortion;
          if (commission > 0) {
            const wallet = await atomicCreditWallet(
              currentId,
              "manCommFromInstallment",
              commission
            );
            const note = `Gen ${gen} managerial commission — Installment portion (${
              genConfig.rate
            }% of ৳${installmentPortion.toLocaleString()}) — Buyer: ${buyerName} (@${buyerUsername}), Share: ${shareTitle} x${qty}`;
            const tx = await TransactionLog.create({
              userId: currentId,
              type: "managerial_installment_commission",
              amount: commission,
              balanceAfter: wallet.manCommFromInstallment,
              relatedPurchaseId: purchase._id,
              note,
            });
            await ledgerCommission(tx._id, currentId, commission, note);
          }
        }
      }
    }
  } catch (err) {
    console.error(
      `[COMMISSION ERROR] distributeCommissions failed for purchaseId=${purchaseId}:`,
      err
    );
    try {
      await Purchase.findByIdAndUpdate(purchaseId, {
        $set: { commissionProcessed: false },
      });
    } catch (rollbackErr) {
      console.error(
        `[COMMISSION ERROR] Failed to roll back commissionProcessed for purchaseId=${purchaseId}:`,
        rollbackErr
      );
    }
  }
};

export const distributeInstallmentPaymentCommission = async (
  purchaseId: string,
  installmentAmount: number,
  installmentNo?: number
) => {
  try {
    const purchase = await Purchase.findById(purchaseId);
    if (!purchase) return;

    const snap = purchase.snapshot;
    if (!snap) return;

    const buyer = await User.findById(purchase.userId).select(
      "generationAncestors name username"
    );
    if (!buyer) return;

    const buyerName = (buyer as any).name ?? "";
    const buyerUsername = (buyer as any).username ?? "";
    const shareTitle = snap.shareTitle ?? "";
    const instLabel = installmentNo
      ? `Installment #${installmentNo}`
      : "Installment payment";

    // Resolve effective per-generation rates.
    // New records: use snap.installmentGenerationRates.
    // Old records (created before this feature): fall back to the legacy flat rate
    // applied uniformly across all generations that have a DP rate configured.
    const instGenRates: { generation: number; rate: number }[] =
      snap.installmentGenerationRates &&
      snap.installmentGenerationRates.length > 0
        ? snap.installmentGenerationRates
        : [];

    const effectiveRates =
      instGenRates.length > 0
        ? instGenRates
        : snap.installmentCommissionRate > 0
        ? snap.downPaymentGenerationRates.map((g) => ({
            generation: g.generation,
            rate: snap.installmentCommissionRate,
          }))
        : [];

    if (effectiveRates.length === 0) return;

    const maxGen = effectiveRates.length;
    for (let gen = 1; gen <= maxGen; gen++) {
      const ancestor = buyer.generationAncestors.find(
        (a: any) => a.level === gen
      );
      if (!ancestor) break;
      const currentId = ancestor.userId.toString();

      const genConfig = effectiveRates.find((g) => g.generation === gen);
      if (!genConfig || genConfig.rate <= 0) continue;

      const commission = (genConfig.rate / 100) * installmentAmount;
      if (commission > 0) {
        // Fix F-03: atomic $inc
        const wallet = await atomicCreditWallet(
          currentId,
          "manCommFromInstallment",
          commission
        );

        const note = `Gen ${gen} managerial commission — ${instLabel} (${
          genConfig.rate
        }% of ৳${installmentAmount.toLocaleString()}) — Buyer: ${buyerName} (@${buyerUsername}), Share: ${shareTitle}`;
        const tx = await TransactionLog.create({
          userId: currentId,
          type: "managerial_installment_commission",
          amount: commission,
          balanceAfter: wallet.manCommFromInstallment,
          relatedPurchaseId: purchase._id,
          note,
        });
        await ledgerCommission(tx._id, currentId, commission, note);
      }
    }
  } catch (err) {
    console.error(
      `[COMMISSION ERROR] distributeInstallmentPaymentCommission failed for purchaseId=${purchaseId}:`,
      err
    );
  }
};
