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
const commissionDebug_model_1 = require("./commissionDebug.model");
const model_2 = require("../wallet/model");
const model_3 = require("../user/model");
const controller_1 = require("../rank/controller");
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
const distributeCommissions = (purchaseId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    try {
        const purchase = yield model_1.Purchase.findById(purchaseId).populate("shareId");
        if (!purchase || purchase.commissionProcessed)
            return;
        const snap = purchase.snapshot;
        if (!snap)
            return; // no snapshot means pre-migration purchase; skip
        const buyer = yield model_3.User.findById(purchase.userId).select("generationAncestors placementAncestors name username");
        if (!buyer)
            return;
        const referrerId = (_b = (_a = buyer.generationAncestors[0]) === null || _a === void 0 ? void 0 : _a.userId) !== null && _b !== void 0 ? _b : null;
        const placementParentId = (_d = (_c = buyer.placementAncestors[0]) === null || _c === void 0 ? void 0 : _c.userId) !== null && _d !== void 0 ? _d : null;
        const debugEntries = [];
        // ── Determine down-payment portion and installment portion ────────────────
        const totalAmount = snap.cashPrice * purchase.quantity;
        let downPaymentPortion;
        let installmentPortion;
        if (purchase.paymentType === "cash") {
            // Cash: DP portion = cashDownPaymentLimit × qty; remainder = installment portion
            downPaymentPortion = Math.min(snap.cashDownPaymentLimit, snap.cashPrice) * purchase.quantity;
            installmentPortion = Math.max(0, snap.cashPrice - snap.cashDownPaymentLimit) * purchase.quantity;
        }
        else {
            // Installment purchase: only the down payment is being approved now
            downPaymentPortion = purchase.amountPaid; // already = maxDownPayment × qty
            installmentPortion = 0; // installment portions handled per installment payment
        }
        // ── 1. Direct Sale Commission ─────────────────────────────────────────────
        if (referrerId) {
            const base = purchase.paymentType === "cash" ? totalAmount : downPaymentPortion;
            const commission = (snap.directSaleCommissionValue / 100) * base;
            if (commission > 0) {
                const wallet = yield model_2.Wallet.findOne({ userId: referrerId });
                if (wallet) {
                    const before = wallet.balance;
                    wallet.balance += commission;
                    yield wallet.save();
                    const referrer = yield model_3.User.findById(referrerId).select("name username");
                    debugEntries.push({
                        userId: referrerId,
                        role: "referrer_direct",
                        field: "balance",
                        before,
                        added: commission,
                        after: wallet.balance,
                        description: `Direct sale commission (${snap.directSaleCommissionValue}%): ৳${commission}`,
                    });
                    yield model_2.TransactionLog.create({
                        userId: referrerId,
                        type: "direct_commission",
                        amount: commission,
                        balanceAfter: wallet.balance,
                        relatedPurchaseId: purchase._id,
                        note: `Direct commission from purchase`,
                    });
                }
            }
            yield model_3.User.findByIdAndUpdate(referrerId, { $inc: { directSalesCount: purchase.quantity } });
            yield (0, controller_1.recalcUserRank)(referrerId.toString());
        }
        // ── 2. Down Payment Managerial Commission (generation-specific rates) ─────
        if (downPaymentPortion > 0) {
            let currentId = placementParentId === null || placementParentId === void 0 ? void 0 : placementParentId.toString();
            const maxGen = snap.downPaymentGenerationRates.length;
            for (let gen = 1; gen <= maxGen && currentId; gen++) {
                const genConfig = snap.downPaymentGenerationRates.find((g) => g.generation === gen);
                if (genConfig && genConfig.rate > 0) {
                    const commission = (genConfig.rate / 100) * downPaymentPortion;
                    const wallet = yield model_2.Wallet.findOne({ userId: currentId });
                    if (wallet) {
                        const before = wallet.pendingManagerialCommissionBalance;
                        wallet.pendingManagerialCommissionBalance += commission;
                        yield wallet.save();
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
                        yield model_2.TransactionLog.create({
                            userId: currentId,
                            type: "managerial_commission",
                            amount: commission,
                            balanceAfter: wallet.balance,
                            relatedPurchaseId: purchase._id,
                            note: `Gen ${gen} DP commission`,
                        });
                    }
                }
                yield model_3.User.findByIdAndUpdate(currentId, { $inc: { teamSalesCount: purchase.quantity } });
                yield (0, controller_1.recalcUserRank)(currentId);
                const ancestor = yield model_3.User.findById(currentId).select("placementAncestors");
                currentId = (_g = (_f = (_e = ancestor === null || ancestor === void 0 ? void 0 : ancestor.placementAncestors) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.userId) === null || _g === void 0 ? void 0 : _g.toString();
            }
        }
        // ── 3. Installment Portion Managerial Commission (same rate for all gens) ─
        if (installmentPortion > 0 && snap.installmentCommissionRate > 0) {
            let currentId = placementParentId === null || placementParentId === void 0 ? void 0 : placementParentId.toString();
            const maxGen = snap.downPaymentGenerationRates.length || 5;
            for (let gen = 1; gen <= maxGen && currentId; gen++) {
                const commission = (snap.installmentCommissionRate / 100) * installmentPortion;
                if (commission > 0) {
                    const wallet = yield model_2.Wallet.findOne({ userId: currentId });
                    if (wallet) {
                        const before = wallet.pendingManagerialCommissionBalance;
                        wallet.pendingManagerialCommissionBalance += commission;
                        yield wallet.save();
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
                        yield model_2.TransactionLog.create({
                            userId: currentId,
                            type: "managerial_installment_commission",
                            amount: commission,
                            balanceAfter: wallet.balance,
                            relatedPurchaseId: purchase._id,
                            note: `Installment portion commission gen ${gen}`,
                        });
                    }
                }
                const ancestor = yield model_3.User.findById(currentId).select("placementAncestors");
                currentId = (_k = (_j = (_h = ancestor === null || ancestor === void 0 ? void 0 : ancestor.placementAncestors) === null || _h === void 0 ? void 0 : _h[0]) === null || _j === void 0 ? void 0 : _j.userId) === null || _k === void 0 ? void 0 : _k.toString();
            }
        }
        purchase.commissionProcessed = true;
        yield purchase.save();
        yield commissionDebug_model_1.CommissionDebug.create({
            purchaseId: purchase._id,
            buyerId: purchase.userId,
            buyerName: buyer.name,
            buyerUsername: buyer.username,
            shareTitle: snap.shareTitle,
            paymentType: purchase.paymentType,
            approvedAmount: purchase.amountPaid,
            entries: debugEntries,
        });
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
    var _a, _b, _c, _d, _e, _f;
    try {
        const purchase = yield model_1.Purchase.findById(purchaseId);
        if (!purchase)
            return;
        const snap = purchase.snapshot;
        if (!snap || snap.installmentCommissionRate <= 0)
            return;
        const buyer = yield model_3.User.findById(purchase.userId).select("placementAncestors");
        if (!buyer)
            return;
        let currentId = (_c = (_b = (_a = buyer.placementAncestors) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.userId) === null || _c === void 0 ? void 0 : _c.toString();
        const maxGen = snap.downPaymentGenerationRates.length || 5;
        for (let gen = 1; gen <= maxGen && currentId; gen++) {
            const commission = (snap.installmentCommissionRate / 100) * installmentAmount;
            if (commission > 0) {
                const wallet = yield model_2.Wallet.findOne({ userId: currentId });
                if (wallet) {
                    wallet.pendingManagerialCommissionBalance += commission;
                    yield wallet.save();
                    yield model_2.TransactionLog.create({
                        userId: currentId,
                        type: "managerial_installment_commission",
                        amount: commission,
                        balanceAfter: wallet.balance,
                        relatedPurchaseId: purchase._id,
                        note: `Installment payment commission gen ${gen}`,
                    });
                }
            }
            const ancestor = yield model_3.User.findById(currentId).select("placementAncestors");
            currentId = (_f = (_e = (_d = ancestor === null || ancestor === void 0 ? void 0 : ancestor.placementAncestors) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.userId) === null || _f === void 0 ? void 0 : _f.toString();
        }
    }
    catch (err) {
        console.error("Installment payment commission error:", err);
    }
});
exports.distributeInstallmentPaymentCommission = distributeInstallmentPaymentCommission;
