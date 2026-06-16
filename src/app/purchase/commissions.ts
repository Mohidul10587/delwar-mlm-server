import { Purchase } from "./model";
import { CommissionDebug, ICommissionDebugEntry } from "./commissionDebug.model";
import { Wallet, TransactionLog } from "../wallet/model";
import { User } from "../user/model";
import { recalcUserRank } from "../rank/controller";

/**
 * Commission distribution using per-purchase snapshot config.
 *
 * Cash purchase: split into down-payment portion (≤ cashDownPaymentLimit)
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
      "generationAncestors placementAncestors name username"
    );
    if (!buyer) return;

    const referrerId = buyer.generationAncestors[0]?.userId ?? null;
    const placementParentId = buyer.placementAncestors[0]?.userId ?? null;

    const debugEntries: ICommissionDebugEntry[] = [];

    // ── Determine down-payment portion and installment portion ────────────────
    const totalAmount = snap.cashPrice * purchase.quantity;
    let downPaymentPortion: number;
    let installmentPortion: number;

    if (purchase.paymentType === "cash") {
      // Cash: DP portion = cashDownPaymentLimit × qty; remainder = installment portion
      downPaymentPortion = Math.min(snap.cashDownPaymentLimit, snap.cashPrice) * purchase.quantity;
      installmentPortion = Math.max(0, snap.cashPrice - snap.cashDownPaymentLimit) * purchase.quantity;
    } else {
      // Installment purchase: only the down payment is being approved now
      downPaymentPortion = purchase.amountPaid; // already = maxDownPayment × qty
      installmentPortion = 0; // installment portions handled per installment payment
    }

    // ── 1. Direct Sale Commission ─────────────────────────────────────────────
    if (referrerId) {
      const base = purchase.paymentType === "cash" ? totalAmount : downPaymentPortion;
      const commission = (snap.directSaleCommissionValue / 100) * base;

      if (commission > 0) {
        const wallet = await Wallet.findOne({ userId: referrerId });
        if (wallet) {
          const before = wallet.balance;
          wallet.balance += commission;
          await wallet.save();

          const referrer = await User.findById(referrerId).select("name username");
          debugEntries.push({
            userId: referrerId,
            role: "referrer_direct",
            field: "balance",
            before,
            added: commission,
            after: wallet.balance,
          description: `Direct sale commission (${snap.directSaleCommissionValue}%): ৳${commission}`,
          });

          await TransactionLog.create({
            userId: referrerId,
            type: "direct_commission",
            amount: commission,
            balanceAfter: wallet.balance,
            relatedPurchaseId: purchase._id,
            note: `Direct commission from purchase`,
          });
        }
      }

      await User.findByIdAndUpdate(referrerId, { $inc: { directSalesCount: purchase.quantity } });
      await recalcUserRank(referrerId.toString());
    }

    // ── 2. Down Payment Managerial Commission (generation-specific rates) ─────
    if (downPaymentPortion > 0) {
      let currentId = placementParentId?.toString();
      const maxGen = snap.downPaymentGenerationRates.length;

      for (let gen = 1; gen <= maxGen && currentId; gen++) {
        const genConfig = snap.downPaymentGenerationRates.find((g) => g.generation === gen);
        if (genConfig && genConfig.rate > 0) {
          const commission = (genConfig.rate / 100) * downPaymentPortion;

          const wallet = await Wallet.findOne({ userId: currentId });
          if (wallet) {
            const before = wallet.pendingManagerialCommissionBalance;
            wallet.pendingManagerialCommissionBalance += commission;
            await wallet.save();

            debugEntries.push({
              userId: wallet.userId,
              role: "managerial_gen",
              generation: gen,
              field: "pendingManagerialCommissionBalance",
              before,
              added: commission,
              after: wallet.pendingManagerialCommissionBalance,
              description: `DP managerial gen ${gen} (${genConfig.rate}%): ৳${commission}`,
            });

            await TransactionLog.create({
              userId: currentId,
              type: "managerial_commission",
              amount: commission,
              balanceAfter: wallet.balance,
              relatedPurchaseId: purchase._id,
              note: `Gen ${gen} DP commission`,
            });
          }
        }

        await User.findByIdAndUpdate(currentId, { $inc: { teamSalesCount: purchase.quantity } });
        await recalcUserRank(currentId);

        const ancestor = await User.findById(currentId).select("placementAncestors");
        currentId = (ancestor as any)?.placementAncestors?.[0]?.userId?.toString();
      }
    }

    // ── 3. Installment Portion Managerial Commission (same rate for all gens) ─
    if (installmentPortion > 0 && snap.installmentCommissionRate > 0) {
      let currentId = placementParentId?.toString();
      const maxGen = snap.downPaymentGenerationRates.length || 5;

      for (let gen = 1; gen <= maxGen && currentId; gen++) {
        const commission = (snap.installmentCommissionRate / 100) * installmentPortion;

        if (commission > 0) {
          const wallet = await Wallet.findOne({ userId: currentId });
          if (wallet) {
            const before = wallet.pendingManagerialCommissionBalance;
            wallet.pendingManagerialCommissionBalance += commission;
            await wallet.save();

            debugEntries.push({
              userId: wallet.userId,
              role: "managerial_installment",
              generation: gen,
              field: "pendingManagerialCommissionBalance",
              before,
              added: commission,
              after: wallet.pendingManagerialCommissionBalance,
              description: `Installment portion commission (${snap.installmentCommissionRate}%): ৳${commission}`,
            });

            await TransactionLog.create({
              userId: currentId,
              type: "managerial_installment_commission",
              amount: commission,
              balanceAfter: wallet.balance,
              relatedPurchaseId: purchase._id,
              note: `Installment portion commission gen ${gen}`,
            });
          }
        }

        const ancestor = await User.findById(currentId).select("placementAncestors");
        currentId = (ancestor as any)?.placementAncestors?.[0]?.userId?.toString();
      }
    }

    purchase.commissionProcessed = true;
    await purchase.save();

    await CommissionDebug.create({
      purchaseId: purchase._id,
      buyerId: purchase.userId,
      buyerName: buyer.name,
      buyerUsername: buyer.username,
      shareTitle: snap.shareTitle,
      paymentType: purchase.paymentType,
      approvedAmount: purchase.amountPaid,
      entries: debugEntries,
    });
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

    const buyer = await User.findById(purchase.userId).select("placementAncestors");
    if (!buyer) return;

    let currentId = buyer.placementAncestors?.[0]?.userId?.toString();
    const maxGen = snap.downPaymentGenerationRates.length || 5;

    for (let gen = 1; gen <= maxGen && currentId; gen++) {
      const commission = (snap.installmentCommissionRate / 100) * installmentAmount;

      if (commission > 0) {
        const wallet = await Wallet.findOne({ userId: currentId });
        if (wallet) {
          wallet.pendingManagerialCommissionBalance += commission;
          await wallet.save();

          await TransactionLog.create({
            userId: currentId,
            type: "managerial_installment_commission",
            amount: commission,
            balanceAfter: wallet.balance,
            relatedPurchaseId: purchase._id,
            note: `Installment payment commission gen ${gen}`,
          });
        }
      }

      const ancestor = await User.findById(currentId).select("placementAncestors");
      currentId = (ancestor as any)?.placementAncestors?.[0]?.userId?.toString();
    }
  } catch (err) {
    console.error("Installment payment commission error:", err);
  }
};
