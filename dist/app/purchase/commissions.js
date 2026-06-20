"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.distributeInstallmentPaymentCommission = exports.distributeCommissions = void 0;
const model_1 = require("./model");
const model_2 = require("../wallet/model");
const model_3 = require("../user/model");
const controller_1 = require("../rank/controller");
const model_4 = require("../ledger/model");
const findOrCreateWallet = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    let wallet = yield model_2.Wallet.findOne({ userId });
    if (!wallet)
        wallet = yield model_2.Wallet.create({
            userId,
            totalBalance: 0,
            directCommissionBalance: 0,
            manCommFromDownPayment: 0,
            manCommFromInstallment: 0,
            salaryBalance: 0,
            rewardBalance: 0,
        });
    return wallet;
});
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
 *   immediately into wallet.directCommissionBalance.
 *
 * Managerial Commission (Down Payment portion): generation-specific rates from snapshot.
 * Managerial Commission (Installment portion): same rate for all generations from snapshot.
 */
const distributeCommissions = (purchaseId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const purchase = yield model_1.Purchase.findById(purchaseId).populate("shareId");
        if (!purchase || purchase.commissionProcessed)
            return;
        const snap = purchase.snapshot;
        if (!snap)
            return; // no snapshot means pre-migration purchase; skip
        const buyer = yield model_3.User.findById(purchase.userId).select("generationAncestors name username");
        if (!buyer)
            return;
        const referrerId = (_b = (_a = buyer.generationAncestors[0]) === null || _a === void 0 ? void 0 : _a.userId) !== null && _b !== void 0 ? _b : null;
        // ── Determine down-payment portion and installment portion ────────────────
        const totalAmount = snap.cashPrice * purchase.quantity;
        let downPaymentPortion;
        let installmentPortion;
        if (purchase.paymentType === "cash") {
            downPaymentPortion =
                Math.min(snap.maxDownPayment, snap.cashPrice) * purchase.quantity;
            installmentPortion =
                Math.max(0, snap.cashPrice - snap.maxDownPayment) * purchase.quantity;
        }
        else {
            downPaymentPortion = purchase.amountPaid;
            installmentPortion = 0;
        }
        // ── 1. Direct Sale Commission ─────────────────────────────────────────────
        if (referrerId) {
            const commission = (snap.directSaleCommissionValue / 100) * downPaymentPortion;
            if (commission > 0) {
                const wallet = yield findOrCreateWallet(referrerId.toString());
                wallet.directCommissionBalance += commission;
                yield wallet.save();
                yield model_2.TransactionLog.create({
                    userId: referrerId,
                    type: "direct_commission",
                    amount: commission,
                    balanceAfter: wallet.directCommissionBalance,
                    relatedPurchaseId: purchase._id,
                    note: `Direct commission from purchase`,
                });
                yield model_4.CompanyLedger.create({
                    date: new Date(),
                    type: "commission_paid",
                    amount: commission,
                    relatedId: purchase._id,
                    relatedModel: "Purchase",
                    userId: referrerId,
                    note: `Direct commission — purchase ${purchase._id}`,
                }).catch(() => { });
            }
            yield model_3.User.findByIdAndUpdate(referrerId, {
                $inc: { directSalesCount: purchase.quantity },
            });
            yield (0, controller_1.recalcUserRank)(referrerId.toString());
        }
        // ── 2. Down Payment Managerial Commission (generation-specific rates) ─────
        // Walk up generationAncestors: level 1 = direct referrer, level 2 = their referrer, etc.
        if (downPaymentPortion > 0) {
            const maxGen = snap.downPaymentGenerationRates.length;
            for (let gen = 1; gen <= maxGen; gen++) {
                const ancestor = buyer.generationAncestors.find((a) => a.level === gen);
                if (!ancestor)
                    break;
                const currentId = ancestor.userId.toString();
                const genConfig = snap.downPaymentGenerationRates.find((g) => g.generation === gen);
                if (genConfig && genConfig.rate > 0) {
                    const commission = (genConfig.rate / 100) * downPaymentPortion;
                    const wallet = yield findOrCreateWallet(currentId);
                    wallet.manCommFromDownPayment += commission;
                    yield wallet.save();
                    yield model_2.TransactionLog.create({
                        userId: currentId,
                        type: "managerial_commission",
                        amount: commission,
                        balanceAfter: wallet.manCommFromDownPayment,
                        relatedPurchaseId: purchase._id,
                        note: `Gen ${gen} DP managerial commission`,
                    });
                    yield model_4.CompanyLedger.create({
                        date: new Date(),
                        type: "commission_paid",
                        amount: commission,
                        relatedModel: "Purchase",
                        userId: currentId,
                        note: `Gen ${gen} DP managerial commission — purchase ${purchase._id}`,
                    }).catch(() => { });
                }
                yield model_3.User.findByIdAndUpdate(currentId, {
                    $inc: { teamSalesCount: purchase.quantity },
                });
                yield (0, controller_1.recalcUserRank)(currentId);
            }
        }
        // ── 3. Installment Portion Managerial Commission (same rate for all gens) ─
        if (installmentPortion > 0 && snap.installmentCommissionRate > 0) {
            const maxGen = snap.downPaymentGenerationRates.length || 5;
            for (let gen = 1; gen <= maxGen; gen++) {
                const ancestor = buyer.generationAncestors.find((a) => a.level === gen);
                if (!ancestor)
                    break;
                const currentId = ancestor.userId.toString();
                const commission = (snap.installmentCommissionRate / 100) * installmentPortion;
                if (commission > 0) {
                    const wallet = yield findOrCreateWallet(currentId);
                    const before = wallet.manCommFromInstallment;
                    wallet.manCommFromInstallment += commission;
                    yield wallet.save();
                    yield model_2.TransactionLog.create({
                        userId: currentId,
                        type: "managerial_installment_commission",
                        amount: commission,
                        balanceAfter: wallet.manCommFromInstallment,
                        relatedPurchaseId: purchase._id,
                        note: `Gen ${gen} installment portion commission`,
                    });
                    yield model_4.CompanyLedger.create({
                        date: new Date(),
                        type: "commission_paid",
                        amount: commission,
                        relatedModel: "Purchase",
                        userId: currentId,
                        note: `Gen ${gen} installment portion commission — purchase ${purchase._id}`,
                    }).catch(() => { });
                }
            }
        }
        purchase.commissionProcessed = true;
        yield purchase.save();
    }
    catch (err) {
        console.error("Commission distribution error:", err);
    }
});
exports.distributeCommissions = distributeCommissions;
/**
 * Distribute installment commission when a single installment payment is approved.
 * Same rate for all generations from snapshot.
 */
const distributeInstallmentPaymentCommission = (purchaseId, installmentAmount) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const purchase = yield model_1.Purchase.findById(purchaseId);
        if (!purchase)
            return;
        const snap = purchase.snapshot;
        if (!snap || snap.installmentCommissionRate <= 0)
            return;
        const buyer = yield model_3.User.findById(purchase.userId).select("generationAncestors");
        if (!buyer)
            return;
        const maxGen = snap.downPaymentGenerationRates.length || 5;
        for (let gen = 1; gen <= maxGen; gen++) {
            const ancestor = buyer.generationAncestors.find((a) => a.level === gen);
            if (!ancestor)
                break;
            const currentId = ancestor.userId.toString();
            const commission = (snap.installmentCommissionRate / 100) * installmentAmount;
            if (commission > 0) {
                const wallet = yield findOrCreateWallet(currentId);
                wallet.manCommFromInstallment += commission;
                yield wallet.save();
                yield model_2.TransactionLog.create({
                    userId: currentId,
                    type: "managerial_installment_commission",
                    amount: commission,
                    balanceAfter: wallet.manCommFromInstallment,
                    relatedPurchaseId: purchase._id,
                    note: `Gen ${gen} installment payment commission`,
                });
                yield model_4.CompanyLedger.create({
                    date: new Date(),
                    type: "commission_paid",
                    amount: commission,
                    relatedModel: "Purchase",
                    userId: currentId,
                    note: `Gen ${gen} installment payment commission — purchase ${purchase._id}`,
                }).catch(() => { });
            }
        }
    }
    catch (err) {
        console.error("Installment payment commission error:", err);
    }
});
exports.distributeInstallmentPaymentCommission = distributeInstallmentPaymentCommission;
