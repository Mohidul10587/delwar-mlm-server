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
exports.checkAndGrantInstallmentReward = exports.checkAndGrantOneTimeReward = void 0;
const model_1 = require("../app/wallet/model");
const model_2 = require("../app/settings/model");
const model_3 = require("../app/purchase/model");
/**
 * Loads reward rules from Settings, sorted by targetAmount ascending.
 * Returns empty array if no rules configured.
 */
const getActiveRewardRules = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const settings = yield model_2.Settings.findOne({}).lean();
    if (!((_a = settings === null || settings === void 0 ? void 0 : settings.installmentRewardRules) === null || _a === void 0 ? void 0 : _a.length))
        return [];
    return [...settings.installmentRewardRules].sort((a, b) => a.targetAmount - b.targetAmount);
});
/**
 * Credits rewardBalance to the user's wallet and logs a TransactionLog entry.
 * Uses $inc to avoid race conditions.
 */
const creditReward = (userId, amount, type, note, relatedPurchaseId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    yield model_1.Wallet.findOneAndUpdate({ userId }, { $inc: { rewardBalance: amount, totalBalance: amount } }, { upsert: true });
    const wallet = yield model_1.Wallet.findOne({ userId }).lean();
    const balanceAfter = (_a = wallet === null || wallet === void 0 ? void 0 : wallet.rewardBalance) !== null && _a !== void 0 ? _a : amount;
    yield model_1.TransactionLog.create({
        userId,
        type,
        amount,
        balanceAfter,
        note,
        relatedPurchaseId,
    });
});
/**
 * Check and grant ONE-TIME reward for a cash/single-payment purchase.
 *
 * Called after a cash purchase is approved (full amount paid at once).
 * Finds the highest targetAmount rule whose target <= amountPaid and
 * grants the oneTimeReward — but only if reward hasn't been given yet.
 *
 * @param purchaseId  - the approved purchase's _id (string)
 * @param userId      - buyer's user _id (string)
 * @param amountPaid  - total amount paid in this single payment
 */
const checkAndGrantOneTimeReward = (purchaseId, userId, amountPaid) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const rules = yield getActiveRewardRules();
        if (!rules.length)
            return;
        // Find the highest target that this payment satisfies
        const eligibleRules = rules.filter((r) => amountPaid >= r.targetAmount);
        if (!eligibleRules.length)
            return;
        const bestRule = eligibleRules[eligibleRules.length - 1]; // highest target
        // Idempotency: check if this exact reward was already granted for this purchase
        const alreadyGranted = yield model_1.TransactionLog.findOne({
            relatedPurchaseId: purchaseId,
            type: "installment_reward_one_time",
        }).lean();
        if (alreadyGranted)
            return;
        yield creditReward(userId, bestRule.oneTimeReward, "installment_reward_one_time", `One-time reward for ৳${amountPaid.toLocaleString()} payment — Target: ৳${bestRule.targetAmount.toLocaleString()}, Reward: ৳${bestRule.oneTimeReward.toLocaleString()}`, purchaseId);
    }
    catch (err) {
        console.error(`[REWARD ERROR] checkAndGrantOneTimeReward failed for purchaseId=${purchaseId}:`, err);
    }
});
exports.checkAndGrantOneTimeReward = checkAndGrantOneTimeReward;
/**
 * Check and grant INSTALLMENT COMPLETION reward after each installment approval.
 *
 * Sums all approved installment payments + the down payment for the purchase,
 * then checks which targetAmount rules are newly crossed. Grants the reward
 * for each newly crossed threshold — only once per threshold per purchase.
 *
 * @param purchaseId - the purchase's _id (string)
 * @param userId     - buyer's user _id (string)
 */
const checkAndGrantInstallmentReward = (purchaseId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const rules = yield getActiveRewardRules();
        if (!rules.length)
            return;
        // Calculate total verified amount paid (down payment + all approved installments)
        const purchase = yield model_3.Purchase.findById(purchaseId).lean();
        if (!purchase)
            return;
        // amountPaid on the purchase document is the authoritative running total
        // (incremented atomically on each installment approval via $inc)
        const totalPaid = (_a = purchase.amountPaid) !== null && _a !== void 0 ? _a : 0;
        if (totalPaid <= 0)
            return;
        // Find all rules whose target has been crossed by totalPaid
        const crossedRules = rules.filter((r) => totalPaid >= r.targetAmount);
        if (!crossedRules.length)
            return;
        // For each crossed rule, check if we already rewarded for this purchase + target
        for (const rule of crossedRules) {
            const alreadyGranted = yield model_1.TransactionLog.findOne({
                relatedPurchaseId: purchaseId,
                type: "installment_reward_completion",
                note: { $regex: `Target: ৳${rule.targetAmount.toLocaleString()}` },
            }).lean();
            if (alreadyGranted)
                continue; // already rewarded for this threshold
            yield creditReward(userId, rule.installmentCompletionReward, "installment_reward_completion", `Installment completion reward — Total paid: ৳${totalPaid.toLocaleString()}, Target: ৳${rule.targetAmount.toLocaleString()}, Reward: ৳${rule.installmentCompletionReward.toLocaleString()}`, purchaseId);
        }
    }
    catch (err) {
        console.error(`[REWARD ERROR] checkAndGrantInstallmentReward failed for purchaseId=${purchaseId}:`, err);
    }
});
exports.checkAndGrantInstallmentReward = checkAndGrantInstallmentReward;
