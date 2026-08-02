import { Purchase } from "./model";
import { Wallet, TransactionLog } from "../wallet/model";
import { User } from "../user/model";
import { recalcUserRank } from "../rank/controller";
import { CompanyLedger } from "../ledger/model";
import { PendingCommission } from "../pending-commission/model";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns today's date as "YYYY-MM-DD" string (UTC) — used as batchId.
 */
const getTodayBatchId = (): string => {
  return new Date().toISOString().slice(0, 10);
};

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

/**
 * Saves a Team Management Commission as Pending (no wallet credit, no ledger).
 * It will be released later by Super Admin via the batch release process.
 */
const savePendingCommission = async (
  userId: string,
  purchaseId: any,
  type: "down_payment_managerial" | "installment_managerial",
  amount: number,
  generation: number,
  note: string
): Promise<void> => {
  try {
    const batchDate = getTodayBatchId();
    await PendingCommission.create({
      userId,
      purchaseId,
      type,
      amount,
      generation,
      note,
      status: "pending",
      batchDate,
      batchId: batchDate,
    });
  } catch (err) {
    console.error(
      `[PENDING COMMISSION ERROR] Failed to save pending commission for userId=${userId}, amount=${amount}:`,
      err
    );
  }
};

// ── Main Commission Distributor ───────────────────────────────────────────────

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

    // ── 1. Direct Sale / Referral Commission ─────────────────────────────────
    // এই কমিশন আগের মতোই Instant ক্রেডিট হবে
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
    // এই কমিশন এখন Pending হিসাবে সংরক্ষিত হবে — Instant ক্রেডিট হবে না
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
          const note = `Gen ${gen} managerial commission — DP (${
            genConfig.rate
          }% of ৳${downPaymentPortion.toLocaleString()}) — Buyer: ${buyerName} (@${buyerUsername}), Share: ${shareTitle} x${qty}`;
          // Pending collection-এ সংরক্ষণ (কোনো wallet update বা ledger entry নয়)
          await savePendingCommission(
            currentId,
            purchase._id,
            "down_payment_managerial",
            commission,
            gen,
            note
          );
        }
        await User.findByIdAndUpdate(currentId, {
          $inc: { teamSalesCount: qty },
        });
        await recalcUserRank(currentId, preloadedRanks); // C-04 fix
      }
    }

    // ── 3. Installment Portion Managerial Commission ──────────────────────────
    // এই কমিশনও এখন Pending হিসাবে সংরক্ষিত হবে — Instant ক্রেডিট হবে না
    // Uses per-generation rates from snap.installmentGenerationRates.
    // Falls back to the legacy flat snap.installmentCommissionRate for old records
    if (installmentPortion > 0) {
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
            const note = `Gen ${gen} managerial commission — Installment portion (${
              genConfig.rate
            }% of ৳${installmentPortion.toLocaleString()}) — Buyer: ${buyerName} (@${buyerUsername}), Share: ${shareTitle} x${qty}`;
            // Pending collection-এ সংরক্ষণ
            await savePendingCommission(
              currentId,
              purchase._id,
              "installment_managerial",
              commission,
              gen,
              note
            );
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

// ── Installment Payment Commission ────────────────────────────────────────────

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
        const note = `Gen ${gen} managerial commission — ${instLabel} (${
          genConfig.rate
        }% of ৳${installmentAmount.toLocaleString()}) — Buyer: ${buyerName} (@${buyerUsername}), Share: ${shareTitle}`;
        // এই কমিশনও Pending হিসাবে সংরক্ষণ করা হচ্ছে
        await savePendingCommission(
          currentId,
          purchase._id,
          "installment_managerial",
          commission,
          gen,
          note
        );
      }
    }
  } catch (err) {
    console.error(
      `[COMMISSION ERROR] distributeInstallmentPaymentCommission failed for purchaseId=${purchaseId}:`,
      err
    );
  }
};
