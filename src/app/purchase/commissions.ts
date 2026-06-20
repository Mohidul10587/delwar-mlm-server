import { Purchase } from "./model";
import { Wallet, TransactionLog } from "../wallet/model";
import { User } from "../user/model";
import { recalcUserRank } from "../rank/controller";
import { CompanyLedger } from "../ledger/model";

const findOrCreateWallet = async (userId: string) => {
  let wallet = await Wallet.findOne({ userId });
  if (!wallet)
    wallet = await Wallet.create({
      userId,
      totalBalance: 0,
      directCommissionBalance: 0,
      manCommFromDownPayment: 0,
      manCommFromInstallment: 0,
      salaryBalance: 0,
      rewardBalance: 0,
    });
  return wallet;
};

const ledgerCommission = async (txId: any, userId: string, amount: number, note: string) => {
  await CompanyLedger.create({
    date: new Date(),
    type: "commission_paid",
    amount,
    relatedId: txId,
    relatedModel: "TransactionLog",
    userId,
    note,
  });
};

export const distributeCommissions = async (purchaseId: string) => {
  try {
    const purchase = await Purchase.findById(purchaseId).populate("shareId");
    if (!purchase || purchase.commissionProcessed) return;

    const snap = purchase.snapshot;
    if (!snap) return;

    const buyer = await User.findById(purchase.userId).select("generationAncestors name username");
    if (!buyer) return;

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
      installmentPortion = Math.max(0, snap.cashPrice - snap.maxDownPayment) * qty;
    } else {
      downPaymentPortion = purchase.amountPaid;
      installmentPortion = 0;
    }

    // ── 1. Direct Sale Commission ─────────────────────────────────────────────
    if (referrerId) {
      const commission = (snap.directSaleCommissionValue / 100) * downPaymentPortion;
      if (commission > 0) {
        const wallet = await findOrCreateWallet(referrerId.toString());
        wallet.directCommissionBalance += commission;
        await wallet.save();

        const note = `Direct sale commission (${snap.directSaleCommissionValue}% of ৳${downPaymentPortion.toLocaleString()}) — Buyer: ${buyerName} (@${buyerUsername}), Share: ${shareTitle} x${qty} [${payType}]`;
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
      await User.findByIdAndUpdate(referrerId, { $inc: { directSalesCount: qty } });
      await recalcUserRank(referrerId.toString());
    }

    // ── 2. Down Payment Managerial Commission ─────────────────────────────────
    if (downPaymentPortion > 0) {
      const maxGen = snap.downPaymentGenerationRates.length;
      for (let gen = 1; gen <= maxGen; gen++) {
        const ancestor = buyer.generationAncestors.find((a: any) => a.level === gen);
        if (!ancestor) break;
        const currentId = ancestor.userId.toString();

        const genConfig = snap.downPaymentGenerationRates.find((g) => g.generation === gen);
        if (genConfig && genConfig.rate > 0) {
          const commission = (genConfig.rate / 100) * downPaymentPortion;
          const wallet = await findOrCreateWallet(currentId);
          wallet.manCommFromDownPayment += commission;
          await wallet.save();

          const note = `Gen ${gen} managerial commission — DP (${genConfig.rate}% of ৳${downPaymentPortion.toLocaleString()}) — Buyer: ${buyerName} (@${buyerUsername}), Share: ${shareTitle} x${qty}`;
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
        await User.findByIdAndUpdate(currentId, { $inc: { teamSalesCount: qty } });
        await recalcUserRank(currentId);
      }
    }

    // ── 3. Installment Portion Managerial Commission ──────────────────────────
    if (installmentPortion > 0 && snap.installmentCommissionRate > 0) {
      const maxGen = snap.downPaymentGenerationRates.length || 5;
      for (let gen = 1; gen <= maxGen; gen++) {
        const ancestor = buyer.generationAncestors.find((a: any) => a.level === gen);
        if (!ancestor) break;
        const currentId = ancestor.userId.toString();

        const commission = (snap.installmentCommissionRate / 100) * installmentPortion;
        if (commission > 0) {
          const wallet = await findOrCreateWallet(currentId);
          wallet.manCommFromInstallment += commission;
          await wallet.save();

          const note = `Gen ${gen} managerial commission — Installment portion (${snap.installmentCommissionRate}% of ৳${installmentPortion.toLocaleString()}) — Buyer: ${buyerName} (@${buyerUsername}), Share: ${shareTitle} x${qty}`;
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

    purchase.commissionProcessed = true;
    await purchase.save();
  } catch (err) {
    console.error("Commission distribution error:", err);
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
    if (!snap || snap.installmentCommissionRate <= 0) return;

    const buyer = await User.findById(purchase.userId).select("generationAncestors name username");
    if (!buyer) return;

    const buyerName = (buyer as any).name ?? "";
    const buyerUsername = (buyer as any).username ?? "";
    const shareTitle = snap.shareTitle ?? "";
    const instLabel = installmentNo ? `Installment #${installmentNo}` : "Installment payment";

    const maxGen = snap.downPaymentGenerationRates.length || 5;
    for (let gen = 1; gen <= maxGen; gen++) {
      const ancestor = buyer.generationAncestors.find((a: any) => a.level === gen);
      if (!ancestor) break;
      const currentId = ancestor.userId.toString();

      const commission = (snap.installmentCommissionRate / 100) * installmentAmount;
      if (commission > 0) {
        const wallet = await findOrCreateWallet(currentId);
        wallet.manCommFromInstallment += commission;
        await wallet.save();

        const note = `Gen ${gen} managerial commission — ${instLabel} (${snap.installmentCommissionRate}% of ৳${installmentAmount.toLocaleString()}) — Buyer: ${buyerName} (@${buyerUsername}), Share: ${shareTitle}`;
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
    console.error("Installment payment commission error:", err);
  }
};
