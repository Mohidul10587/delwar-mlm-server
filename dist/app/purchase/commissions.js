"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
// M-10 fix: removed conflicting $setOnInsert + $inc on same fields.
// Use a two-step upsert: ensure wallet exists first, then $inc atomically.
const atomicCreditWallet = (userId, field, amount) => __awaiter(void 0, void 0, void 0, function* () {
    // Ensure wallet document exists (no-op if already exists)
    yield model_2.Wallet.findOneAndUpdate({ userId }, {
        $setOnInsert: {
            userId,
            totalBalance: 0,
            directCommissionBalance: 0,
            manCommFromDownPayment: 0,
            manCommFromInstallment: 0,
            salaryBalance: 0,
            rewardBalance: 0,
            incentiveBonus: 0,
            transferBalance: 0,
        },
    }, { upsert: true });
    // Then atomically increment — no conflict with $setOnInsert
    const wallet = yield model_2.Wallet.findOneAndUpdate({ userId }, { $inc: { [field]: amount, totalBalance: amount } }, { new: true });
    if (!wallet)
        throw new Error(`Wallet not found for userId=${userId} after upsert`);
    return wallet;
});
const ledgerCommission = (txId, userId, amount, note) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield model_4.CompanyLedger.create({
            date: new Date(),
            type: "commission_paid",
            amount,
            relatedId: txId,
            relatedModel: "TransactionLog",
            userId,
            note,
        });
    }
    catch (err) {
        // Log ledger failure — financial audit trail must be preserved
        console.error(`[LEDGER ERROR] Failed to create commission ledger for userId=${userId}, amount=${amount}:`, err);
    }
});
const distributeCommissions = (purchaseId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    try {
        const purchase = yield model_1.Purchase.findOneAndUpdate({ _id: purchaseId, commissionProcessed: false }, { $set: { commissionProcessed: true } }, { new: true }).populate("shareId");
        if (!purchase)
            return;
        const snap = purchase.snapshot;
        if (!snap)
            return;
        const buyer = yield model_3.User.findById(purchase.userId).select("generationAncestors name username");
        if (!buyer)
            return;
        // C-04 fix: load Settings once and pass to all recalcUserRank calls
        const { Settings } = yield Promise.resolve().then(() => __importStar(require("../settings/model")));
        const settingsDoc = yield Settings.findOne();
        const preloadedRanks = ((_a = settingsDoc === null || settingsDoc === void 0 ? void 0 : settingsDoc.ranks) !== null && _a !== void 0 ? _a : []);
        const buyerName = (_b = buyer.name) !== null && _b !== void 0 ? _b : "";
        const buyerUsername = (_c = buyer.username) !== null && _c !== void 0 ? _c : "";
        const shareTitle = (_d = snap.shareTitle) !== null && _d !== void 0 ? _d : "";
        const qty = purchase.quantity;
        const payType = purchase.paymentType === "cash" ? "Cash" : "Installment";
        const referrerId = (_f = (_e = buyer.generationAncestors[0]) === null || _e === void 0 ? void 0 : _e.userId) !== null && _f !== void 0 ? _f : null;
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
                const wallet = yield atomicCreditWallet(referrerId.toString(), "directCommissionBalance", commission);
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
            yield (0, controller_1.recalcUserRank)(referrerId.toString(), preloadedRanks); // C-04 fix
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
                    const wallet = yield atomicCreditWallet(currentId, "manCommFromDownPayment", commission);
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
                yield (0, controller_1.recalcUserRank)(currentId, preloadedRanks); // C-04 fix
            }
        }
        // ── 3. Installment Portion Managerial Commission ──────────────────────────
        // Uses per-generation rates from snap.installmentGenerationRates.
        // Falls back to the legacy flat snap.installmentCommissionRate for old records
        // that were created before the per-gen array was introduced.
        if (installmentPortion > 0) {
            const instGenRates = snap.installmentGenerationRates && snap.installmentGenerationRates.length > 0
                ? snap.installmentGenerationRates
                : [];
            // Legacy flat-rate fallback: build a synthetic per-gen array where every gen
            // shares the same rate (old behaviour), but only when the new array is absent.
            const effectiveRates = instGenRates.length > 0
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
                    const ancestor = buyer.generationAncestors.find((a) => a.level === gen);
                    if (!ancestor)
                        break;
                    const currentId = ancestor.userId.toString();
                    const genConfig = effectiveRates.find((g) => g.generation === gen);
                    if (!genConfig || genConfig.rate <= 0)
                        continue;
                    const commission = (genConfig.rate / 100) * installmentPortion;
                    if (commission > 0) {
                        const wallet = yield atomicCreditWallet(currentId, "manCommFromInstallment", commission);
                        const note = `Gen ${gen} managerial commission — Installment portion (${genConfig.rate}% of ৳${installmentPortion.toLocaleString()}) — Buyer: ${buyerName} (@${buyerUsername}), Share: ${shareTitle} x${qty}`;
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
        }
    }
    catch (err) {
        console.error(`[COMMISSION ERROR] distributeCommissions failed for purchaseId=${purchaseId}:`, err);
        try {
            yield model_1.Purchase.findByIdAndUpdate(purchaseId, { $set: { commissionProcessed: false } });
        }
        catch (rollbackErr) {
            console.error(`[COMMISSION ERROR] Failed to roll back commissionProcessed for purchaseId=${purchaseId}:`, rollbackErr);
        }
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
        if (!snap)
            return;
        const buyer = yield model_3.User.findById(purchase.userId).select("generationAncestors name username");
        if (!buyer)
            return;
        const buyerName = (_a = buyer.name) !== null && _a !== void 0 ? _a : "";
        const buyerUsername = (_b = buyer.username) !== null && _b !== void 0 ? _b : "";
        const shareTitle = (_c = snap.shareTitle) !== null && _c !== void 0 ? _c : "";
        const instLabel = installmentNo ? `Installment #${installmentNo}` : "Installment payment";
        // Resolve effective per-generation rates.
        // New records: use snap.installmentGenerationRates.
        // Old records (created before this feature): fall back to the legacy flat rate
        // applied uniformly across all generations that have a DP rate configured.
        const instGenRates = snap.installmentGenerationRates && snap.installmentGenerationRates.length > 0
            ? snap.installmentGenerationRates
            : [];
        const effectiveRates = instGenRates.length > 0
            ? instGenRates
            : snap.installmentCommissionRate > 0
                ? snap.downPaymentGenerationRates.map((g) => ({
                    generation: g.generation,
                    rate: snap.installmentCommissionRate,
                }))
                : [];
        if (effectiveRates.length === 0)
            return;
        const maxGen = effectiveRates.length;
        for (let gen = 1; gen <= maxGen; gen++) {
            const ancestor = buyer.generationAncestors.find((a) => a.level === gen);
            if (!ancestor)
                break;
            const currentId = ancestor.userId.toString();
            const genConfig = effectiveRates.find((g) => g.generation === gen);
            if (!genConfig || genConfig.rate <= 0)
                continue;
            const commission = (genConfig.rate / 100) * installmentAmount;
            if (commission > 0) {
                // Fix F-03: atomic $inc
                const wallet = yield atomicCreditWallet(currentId, "manCommFromInstallment", commission);
                const note = `Gen ${gen} managerial commission — ${instLabel} (${genConfig.rate}% of ৳${installmentAmount.toLocaleString()}) — Buyer: ${buyerName} (@${buyerUsername}), Share: ${shareTitle}`;
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
        console.error(`[COMMISSION ERROR] distributeInstallmentPaymentCommission failed for purchaseId=${purchaseId}:`, err);
    }
});
exports.distributeInstallmentPaymentCommission = distributeInstallmentPaymentCommission;
