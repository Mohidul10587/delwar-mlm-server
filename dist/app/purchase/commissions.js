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
const ledgerCommission = (txId, userId, amount, note) => __awaiter(void 0, void 0, void 0, function* () {
    yield model_4.CompanyLedger.create({
        date: new Date(),
        type: "commission_paid",
        amount,
        relatedId: txId,
        relatedModel: "TransactionLog",
        userId,
        note,
    });
});
const distributeCommissions = (purchaseId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    try {
        const purchase = yield model_1.Purchase.findById(purchaseId).populate("shareId");
        if (!purchase || purchase.commissionProcessed)
            return;
        const snap = purchase.snapshot;
        if (!snap)
            return;
        const buyer = yield model_3.User.findById(purchase.userId).select("generationAncestors name username");
        if (!buyer)
            return;
        const buyerName = (_a = buyer.name) !== null && _a !== void 0 ? _a : "";
        const buyerUsername = (_b = buyer.username) !== null && _b !== void 0 ? _b : "";
        const shareTitle = (_c = snap.shareTitle) !== null && _c !== void 0 ? _c : "";
        const qty = purchase.quantity;
        const payType = purchase.paymentType === "cash" ? "Cash" : "Installment";
        const referrerId = (_e = (_d = buyer.generationAncestors[0]) === null || _d === void 0 ? void 0 : _d.userId) !== null && _e !== void 0 ? _e : null;
        let downPaymentPortion;
        let installmentPortion;
        if (purchase.paymentType === "cash") {
            downPaymentPortion = Math.min(snap.maxDownPayment, snap.cashPrice) * qty;
            installmentPortion = Math.max(0, snap.cashPrice - snap.maxDownPayment) * qty;
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
                const note = `Direct sale commission (${snap.directSaleCommissionValue}% of ৳${downPaymentPortion.toLocaleString()}) — Buyer: ${buyerName} (@${buyerUsername}), Share: ${shareTitle} x${qty} [${payType}]`;
                const tx = yield model_2.TransactionLog.create({
                    userId: referrerId,
                    type: "direct_commission",
                    amount: commission,
                    balanceAfter: wallet.directCommissionBalance,
                    relatedPurchaseId: purchase._id,
                    note,
                });
                yield ledgerCommission(tx._id, referrerId.toString(), commission, note);
            }
            yield model_3.User.findByIdAndUpdate(referrerId, { $inc: { directSalesCount: qty } });
            yield (0, controller_1.recalcUserRank)(referrerId.toString());
        }
        // ── 2. Down Payment Managerial Commission ─────────────────────────────────
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
                    const note = `Gen ${gen} managerial commission — DP (${genConfig.rate}% of ৳${downPaymentPortion.toLocaleString()}) — Buyer: ${buyerName} (@${buyerUsername}), Share: ${shareTitle} x${qty}`;
                    const tx = yield model_2.TransactionLog.create({
                        userId: currentId,
                        type: "managerial_commission",
                        amount: commission,
                        balanceAfter: wallet.manCommFromDownPayment,
                        relatedPurchaseId: purchase._id,
                        note,
                    });
                    yield ledgerCommission(tx._id, currentId, commission, note);
                }
                yield model_3.User.findByIdAndUpdate(currentId, { $inc: { teamSalesCount: qty } });
                yield (0, controller_1.recalcUserRank)(currentId);
            }
        }
        // ── 3. Installment Portion Managerial Commission ──────────────────────────
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
                    wallet.manCommFromInstallment += commission;
                    yield wallet.save();
                    const note = `Gen ${gen} managerial commission — Installment portion (${snap.installmentCommissionRate}% of ৳${installmentPortion.toLocaleString()}) — Buyer: ${buyerName} (@${buyerUsername}), Share: ${shareTitle} x${qty}`;
                    const tx = yield model_2.TransactionLog.create({
                        userId: currentId,
                        type: "managerial_installment_commission",
                        amount: commission,
                        balanceAfter: wallet.manCommFromInstallment,
                        relatedPurchaseId: purchase._id,
                        note,
                    });
                    yield ledgerCommission(tx._id, currentId, commission, note);
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
const distributeInstallmentPaymentCommission = (purchaseId, installmentAmount, installmentNo) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const purchase = yield model_1.Purchase.findById(purchaseId);
        if (!purchase)
            return;
        const snap = purchase.snapshot;
        if (!snap || snap.installmentCommissionRate <= 0)
            return;
        const buyer = yield model_3.User.findById(purchase.userId).select("generationAncestors name username");
        if (!buyer)
            return;
        const buyerName = (_a = buyer.name) !== null && _a !== void 0 ? _a : "";
        const buyerUsername = (_b = buyer.username) !== null && _b !== void 0 ? _b : "";
        const shareTitle = (_c = snap.shareTitle) !== null && _c !== void 0 ? _c : "";
        const instLabel = installmentNo ? `Installment #${installmentNo}` : "Installment payment";
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
                const note = `Gen ${gen} managerial commission — ${instLabel} (${snap.installmentCommissionRate}% of ৳${installmentAmount.toLocaleString()}) — Buyer: ${buyerName} (@${buyerUsername}), Share: ${shareTitle}`;
                const tx = yield model_2.TransactionLog.create({
                    userId: currentId,
                    type: "managerial_installment_commission",
                    amount: commission,
                    balanceAfter: wallet.manCommFromInstallment,
                    relatedPurchaseId: purchase._id,
                    note,
                });
                yield ledgerCommission(tx._id, currentId, commission, note);
            }
        }
    }
    catch (err) {
        console.error("Installment payment commission error:", err);
    }
});
exports.distributeInstallmentPaymentCommission = distributeInstallmentPaymentCommission;
