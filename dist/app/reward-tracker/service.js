"use strict";
/**
 * Reward Tracker Service
 *
 * প্রতিটি installment approval-এর পরে এই service call করা হয়।
 * এটি নির্ধারণ করে:
 *   - নতুন payment-এ কয়টি Cycle পূর্ণ হলো
 *   - প্রতিটি Cycle full_payment নাকি split_payment
 *   - Carry Forward কত বাকি থাকলো
 *   - Reward কত হবে
 *
 * এই service কোনো Wallet update করে না।
 * Reward disbursement admin approval-এর পরে আলাদাভাবে হবে।
 */
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
exports.getRewardTrackersByUser = exports.getRewardTrackerByPurchase = exports.processRewardAfterPayment = void 0;
const model_1 = require("./model");
const model_2 = require("../settings/model");
const model_3 = require("../purchase/model");
const model_4 = require("../wallet/model");
const model_5 = require("../ledger/model");
const LEGACY_REWARD_CONFIG = {
    enabled: false,
    cycleTargetAmount: 100000,
    fullPaymentRewardAmount: 5000,
    splitPaymentRewardAmount: 3000,
};
/**
 * একটি payment approve হওয়ার পরে RewardTracker update করো।
 *
 * @param purchaseId   কোন purchase-এর installment approve হলো
 * @param paymentAmount এই payment-এর টাকার পরিমাণ
 * @param isFirstPayment true হলে (down payment) এটি প্রথম payment
 */
const processRewardAfterPayment = (purchaseId, paymentAmount, sourcePaymentId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g;
    try {
        const purchase = yield model_3.Purchase.findById(purchaseId).lean();
        if (!purchase)
            return;
        let settings = yield model_2.Settings.findOne().lean();
        // Older installations can have a Settings document created before
        // rewardConfig existed. Persist a disabled default so this is visible and
        // configurable instead of silently remaining absent forever.
        if (settings && !settings.rewardConfig) {
            settings = yield model_2.Settings.findOneAndUpdate({ _id: settings._id, rewardConfig: { $exists: false } }, { $set: { rewardConfig: LEGACY_REWARD_CONFIG } }, { new: true }).lean();
        }
        const config = settings === null || settings === void 0 ? void 0 : settings.rewardConfig;
        if (!(config === null || config === void 0 ? void 0 : config.enabled) || !config.cycleTargetAmount || config.cycleTargetAmount <= 0) {
            return;
        }
        const cycleTargetAmount = config.cycleTargetAmount;
        const fullPaymentRewardAmount = (_a = config.fullPaymentRewardAmount) !== null && _a !== void 0 ? _a : 0;
        const splitPaymentRewardAmount = (_b = config.splitPaymentRewardAmount) !== null && _b !== void 0 ? _b : 0;
        // Tracker খুঁজি বা তৈরি করি
        let tracker = yield model_1.RewardTracker.findOne({ purchaseId });
        if (!tracker) {
            tracker = yield model_1.RewardTracker.create({
                userId: purchase.userId,
                purchaseId: purchase._id,
                cycleTargetAmount,
                totalPaidAmount: 0,
                carryForwardAmount: 0,
                completedCycles: 0,
                cycles: [],
                processedPaymentIds: [],
                fullPaymentRewardAmount,
                splitPaymentRewardAmount,
            });
        }
        // Approval routes normally call this once, but this guard makes retries
        // and administrative backfills safe even when a payment does not complete
        // a reward cycle.
        if (sourcePaymentId &&
            ((_c = tracker.processedPaymentIds) !== null && _c !== void 0 ? _c : []).some((id) => id.toString() === sourcePaymentId)) {
            return;
        }
        // ── Payment processing ────────────────────────────────────────────────────
        //
        // উদাহরণ: cycleTarget = 100,000
        //   paymentAmount = 240,000 (4 কিস্তি × 60,000)
        //   carryForward (আগের) = 0
        //
        //   Cycle 1: carry(0) + payment(240,000) = 240,000 → পূর্ণ (100,000)
        //     → full_payment কারণ একটি payment-এই 100,000 ছাড়িয়েছে
        //     → বাকি = 140,000
        //   Cycle 2: 140,000 → পূর্ণ (100,000)
        //     → full_payment কারণ এখনো একই payment-এর অংশ
        //     → বাকি = 40,000
        //   নতুন carryForward = 40,000
        //
        // পরবর্তী payment = 60,000:
        //   Cycle 3: carry(40,000) + payment(60,000) = 100,000 → পূর্ণ
        //     → split_payment কারণ carry forward আছে
        //     → বাকি = 0
        let carry = tracker.carryForwardAmount;
        const prevCycles = tracker.completedCycles;
        // এই payment-এ সম্পূর্ণ নতুন টাকা কত (carry ছাড়া)
        let remainingNewMoney = paymentAmount;
        const newCycles = [];
        while (carry + remainingNewMoney >= cycleTargetAmount) {
            const needed = cycleTargetAmount - carry;
            // Cycle type নির্ধারণ:
            // carry > 0 হলে split (আগের টাকা মিলিয়ে পূর্ণ হয়েছে)
            // carry === 0 এবং remainingNewMoney >= cycleTargetAmount হলে full
            const cycleType = carry === 0 ? "full_payment" : "split_payment";
            const rewardAmount = cycleType === "full_payment"
                ? fullPaymentRewardAmount
                : splitPaymentRewardAmount;
            newCycles.push({
                cycleNumber: prevCycles + newCycles.length + 1,
                cycleType,
                completedAmount: cycleTargetAmount,
                completedAt: new Date(),
                rewardAmount,
                // Reward is credited as part of payment approval, so it is already paid.
                status: "paid",
                paidAt: new Date(),
                sourcePaymentId: sourcePaymentId,
            });
            remainingNewMoney -= needed;
            carry = 0; // Cycle পূর্ণ হওয়ার পরে carry reset
        }
        // নতুন carryForward = পুরনো carry যদি cycle পূর্ণ না হয়, অথবা
        // শেষ cycle-এর পরে remaining new money
        const newCarry = newCycles.length > 0
            ? remainingNewMoney // cycle(s) হয়েছে, carry = বাকি নতুন টাকা
            : carry + remainingNewMoney; // কোনো cycle হয়নি, পুরনো + নতুন
        // Tracker update
        tracker.totalPaidAmount = ((_d = tracker.totalPaidAmount) !== null && _d !== void 0 ? _d : 0) + paymentAmount;
        tracker.carryForwardAmount = newCarry;
        tracker.completedCycles = prevCycles + newCycles.length;
        tracker.cycles = [...((_e = tracker.cycles) !== null && _e !== void 0 ? _e : []), ...newCycles];
        if (sourcePaymentId) {
            tracker.processedPaymentIds = [
                ...((_f = tracker.processedPaymentIds) !== null && _f !== void 0 ? _f : []),
                sourcePaymentId,
            ];
            tracker.markModified("processedPaymentIds");
        }
        tracker.markModified("cycles");
        yield tracker.save();
        // Credit all cycles in one atomic wallet update, then write the matching
        // transaction and ledger rows in batches. This prevents an N+1 sequence
        // when one grouped installment completes multiple reward cycles.
        const payableCycles = newCycles.filter((cycle) => cycle.rewardAmount > 0);
        if (payableCycles.length > 0) {
            const totalReward = payableCycles.reduce((sum, cycle) => sum + cycle.rewardAmount, 0);
            const wallet = yield model_4.Wallet.findOneAndUpdate({ userId: purchase.userId }, {
                $setOnInsert: { userId: purchase.userId },
                $inc: {
                    rewardBalanceFromInstallment: totalReward,
                    totalBalance: totalReward,
                },
            }, { new: true, upsert: true }).lean();
            let runningRewardBalance = ((_g = wallet === null || wallet === void 0 ? void 0 : wallet.rewardBalanceFromInstallment) !== null && _g !== void 0 ? _g : totalReward) - totalReward;
            const transactionPayloads = payableCycles.map((cycle) => {
                runningRewardBalance += cycle.rewardAmount;
                const label = cycle.cycleType === "full_payment" ? "Full payment" : "Split payment";
                const note = `${label} installment reward — Cycle #${cycle.cycleNumber}, ৳${cycle.completedAmount.toLocaleString()} target, reward ৳${cycle.rewardAmount.toLocaleString()}`;
                return {
                    userId: purchase.userId,
                    type: cycle.cycleType === "full_payment"
                        ? "installment_reward_one_time"
                        : "installment_reward_completion",
                    amount: cycle.rewardAmount,
                    balanceAfter: runningRewardBalance,
                    note,
                    relatedPurchaseId: purchase._id,
                };
            });
            const transactions = yield model_4.TransactionLog.insertMany(transactionPayloads);
            yield model_5.CompanyLedger.insertMany(transactions.map((transaction, index) => ({
                date: new Date(),
                type: "installment_reward_paid",
                amount: payableCycles[index].rewardAmount,
                relatedId: transaction._id,
                relatedModel: "TransactionLog",
                userId: purchase.userId,
                note: transactionPayloads[index].note,
            })));
        }
    }
    catch (err) {
        console.error(`[REWARD TRACKER] processRewardAfterPayment failed for purchaseId=${purchaseId}:`, err);
        // Non-critical — don't rethrow. Main transaction must not fail.
    }
});
exports.processRewardAfterPayment = processRewardAfterPayment;
/**
 * একটি purchase-এর RewardTracker সারসংক্ষেপ return করো।
 */
const getRewardTrackerByPurchase = (purchaseId) => __awaiter(void 0, void 0, void 0, function* () {
    return yield model_1.RewardTracker.findOne({ purchaseId }).lean();
});
exports.getRewardTrackerByPurchase = getRewardTrackerByPurchase;
/**
 * একজন user-এর সমস্ত RewardTracker return করো।
 */
const getRewardTrackersByUser = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    return yield model_1.RewardTracker.find({ userId })
        .populate("purchaseId", "snapshot quantity createdAt")
        .sort({ createdAt: -1 })
        .lean();
});
exports.getRewardTrackersByUser = getRewardTrackersByUser;
