import { Purchase } from "./model";
import { Wallet, TransactionLog } from "../wallet/model";
import { User } from "../user/model";
import { recalcUserRank } from "../rank/controller";

const findOrCreateWallet = async (userId: string) => {
  let wallet = await Wallet.findOne({ userId });
  if (!wallet)
    wallet = await Wallet.create({
      userId,
      balance: 0,
      directCommissionBalance: 0,
      manCommFromDownPayment: 0,
      manCommFromInstallment: 0,
      salaryBalance: 0,
      rewardBalance: 0,
    });
  return wallet;
};

/**
 * Commission distribution using per-purchase snapshot config.
 *
 * Cash purchase: split into down-payment portion (≤ maxDownPayment)
 *   and installment portion (remainder). Each uses different commission rules.
 *
 * Installment purchase: down-payment portion = amountPaid (first payment).
 *   Subsequent installment payments trigger installment commission separately.
 *
 * Direct Sale Commission: goes to the buyer's direct referrer (gen ancestor[0])
 *   immediately into wallet.balance.
 *
 * Managerial Commission (Down Payment portion): generation-specific rates from snapshot.
 * Managerial Commission (Installment portion): same rate for all generations from snapshot.
 */
export const distributeCommissions = async (purchaseId: string) => {
  try {
    const purchase = await Purchase.findById(purchaseId).populate("shareId");
    if (!purchase || purchase.commissionProcessed) return;

    const snap = purchase.snapshot;
    if (!snap) return; // no snapshot means pre-migration purchase; skip

    const buyer = await User.findById(purchase.userId).select(
      "generationAncestors name username"
    );
    if (!buyer) return;

    const referrerId = buyer.generationAncestors[0]?.userId ?? null;

    // ── Determine down-payment portion and installment portion ────────────────
    const totalAmount = snap.cashPrice * purchase.quantity;
    let downPaymentPortion: number;
    let installmentPortion: number;

    if (purchase.paymentType === "cash") {
      downPaymentPortion =
        Math.min(snap.maxDownPayment, snap.cashPrice) * purchase.quantity;
      installmentPortion =
        Math.max(0, snap.cashPrice - snap.maxDownPayment) * purchase.quantity;
    } else {
      downPaymentPortion = purchase.amountPaid;
      installmentPortion = 0;
    }

    // ── 1. Direct Sale Commission ─────────────────────────────────────────────
    if (referrerId) {
      const base =
        purchase.paymentType === "cash" ? totalAmount : downPaymentPortion;
      const commission = (snap.directSaleCommissionValue / 100) * base;

      if (commission > 0) {
        const wallet = await findOrCreateWallet(referrerId.toString());
        wallet.directCommissionBalance += commission;
        await wallet.save();

        await TransactionLog.create({
          userId: referrerId,
          type: "direct_commission",
          amount: commission,
          balanceAfter: wallet.directCommissionBalance,
          relatedPurchaseId: purchase._id,
          note: `Direct commission from purchase`,
        });
      }

      await User.findByIdAndUpdate(referrerId, {
        $inc: { directSalesCount: purchase.quantity },
      });
      await recalcUserRank(referrerId.toString());
    }

    // ── 2. Down Payment Managerial Commission (generation-specific rates) ─────
    // Walk up generationAncestors: level 1 = direct referrer, level 2 = their referrer, etc.
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
          const wallet = await findOrCreateWallet(currentId);
          wallet.manCommFromDownPayment += commission;
          await wallet.save();

          await TransactionLog.create({
            userId: currentId,
            type: "managerial_commission",
            amount: commission,
            balanceAfter: wallet.manCommFromDownPayment,
            relatedPurchaseId: purchase._id,
            note: `Gen ${gen} DP managerial commission`,
          });
        }

        await User.findByIdAndUpdate(currentId, {
          $inc: { teamSalesCount: purchase.quantity },
        });
        await recalcUserRank(currentId);
      }
    }

    // ── 3. Installment Portion Managerial Commission (same rate for all gens) ─
    if (installmentPortion > 0 && snap.installmentCommissionRate > 0) {
      const maxGen = snap.downPaymentGenerationRates.length || 5;
      for (let gen = 1; gen <= maxGen; gen++) {
        const ancestor = buyer.generationAncestors.find(
          (a: any) => a.level === gen
        );
        if (!ancestor) break;
        const currentId = ancestor.userId.toString();

        const commission =
          (snap.installmentCommissionRate / 100) * installmentPortion;
        if (commission > 0) {
          const wallet = await findOrCreateWallet(currentId);
          const before = wallet.manCommFromInstallment;
          wallet.manCommFromInstallment += commission;
          await wallet.save();

          await TransactionLog.create({
            userId: currentId,
            type: "managerial_installment_commission",
            amount: commission,
            balanceAfter: wallet.manCommFromInstallment,
            relatedPurchaseId: purchase._id,
            note: `Gen ${gen} installment portion commission`,
          });
        }
      }
    }

    purchase.commissionProcessed = true;
    await purchase.save();
  } catch (err) {
    console.error("Commission distribution error:", err);
  }
};

/**
 * Distribute installment commission when a single installment payment is approved.
 * Same rate for all generations from snapshot.
 */
export const distributeInstallmentPaymentCommission = async (
  purchaseId: string,
  installmentAmount: number
) => {
  try {
    const purchase = await Purchase.findById(purchaseId);
    if (!purchase) return;

    const snap = purchase.snapshot;
    if (!snap || snap.installmentCommissionRate <= 0) return;

    const buyer = await User.findById(purchase.userId).select(
      "generationAncestors"
    );
    if (!buyer) return;

    const maxGen = snap.downPaymentGenerationRates.length || 5;
    for (let gen = 1; gen <= maxGen; gen++) {
      const ancestor = buyer.generationAncestors.find(
        (a: any) => a.level === gen
      );
      if (!ancestor) break;
      const currentId = ancestor.userId.toString();

      const commission =
        (snap.installmentCommissionRate / 100) * installmentAmount;
      if (commission > 0) {
        const wallet = await findOrCreateWallet(currentId);
        wallet.manCommFromInstallment += commission;
        await wallet.save();

        await TransactionLog.create({
          userId: currentId,
          type: "managerial_installment_commission",
          amount: commission,
          balanceAfter: wallet.manCommFromInstallment,
          relatedPurchaseId: purchase._id,
          note: `Gen ${gen} installment payment commission`,
        });
      }
    }
  } catch (err) {
    console.error("Installment payment commission error:", err);
  }
};
