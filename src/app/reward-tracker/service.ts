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

import { RewardTracker, IRewardCycle } from "./model";
import { Settings } from "../settings/model";
import { Purchase } from "../purchase/model";
import { Wallet, TransactionLog } from "../wallet/model";
import { CompanyLedger } from "../ledger/model";

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
export const processRewardAfterPayment = async (
  purchaseId: string,
  paymentAmount: number,
  sourcePaymentId?: string
): Promise<void> => {
  try {
    const purchase = await Purchase.findById(purchaseId).lean();
    if (!purchase) return;

    let settings = await Settings.findOne().lean();

    // Older installations can have a Settings document created before
    // rewardConfig existed. Persist a disabled default so this is visible and
    // configurable instead of silently remaining absent forever.
    if (settings && !(settings as any).rewardConfig) {
      settings = await Settings.findOneAndUpdate(
        { _id: (settings as any)._id, rewardConfig: { $exists: false } },
        { $set: { rewardConfig: LEGACY_REWARD_CONFIG } },
        { new: true }
      ).lean();
    }

    const config = (settings as any)?.rewardConfig;
    if (!config?.enabled || !config.cycleTargetAmount || config.cycleTargetAmount <= 0) {
      return;
    }
    const cycleTargetAmount: number = config.cycleTargetAmount;
    const fullPaymentRewardAmount: number = config.fullPaymentRewardAmount ?? 0;
    const splitPaymentRewardAmount: number = config.splitPaymentRewardAmount ?? 0;

    // Tracker খুঁজি বা তৈরি করি
    let tracker = await RewardTracker.findOne({ purchaseId });
    if (!tracker) {
      tracker = await RewardTracker.create({
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
    if (
      sourcePaymentId &&
      (tracker.processedPaymentIds ?? []).some(
        (id) => id.toString() === sourcePaymentId
      )
    ) {
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
    const newCycles: IRewardCycle[] = [];

    while (carry + remainingNewMoney >= cycleTargetAmount) {
      const needed = cycleTargetAmount - carry;

      // Cycle type নির্ধারণ:
      // carry > 0 হলে split (আগের টাকা মিলিয়ে পূর্ণ হয়েছে)
      // carry === 0 এবং remainingNewMoney >= cycleTargetAmount হলে full
      const cycleType: "full_payment" | "split_payment" =
        carry === 0 ? "full_payment" : "split_payment";

      const rewardAmount =
        cycleType === "full_payment"
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
        sourcePaymentId: sourcePaymentId as any,
      });

      remainingNewMoney -= needed;
      carry = 0; // Cycle পূর্ণ হওয়ার পরে carry reset
    }

    // নতুন carryForward = পুরনো carry যদি cycle পূর্ণ না হয়, অথবা
    // শেষ cycle-এর পরে remaining new money
    const newCarry =
      newCycles.length > 0
        ? remainingNewMoney          // cycle(s) হয়েছে, carry = বাকি নতুন টাকা
        : carry + remainingNewMoney; // কোনো cycle হয়নি, পুরনো + নতুন

    // Tracker update
    tracker.totalPaidAmount = (tracker.totalPaidAmount ?? 0) + paymentAmount;
    tracker.carryForwardAmount = newCarry;
    tracker.completedCycles = prevCycles + newCycles.length;
    tracker.cycles = [...(tracker.cycles ?? []), ...newCycles];
    if (sourcePaymentId) {
      tracker.processedPaymentIds = [
        ...(tracker.processedPaymentIds ?? []),
        sourcePaymentId as any,
      ];
      tracker.markModified("processedPaymentIds");
    }
    tracker.markModified("cycles");
    await tracker.save();

    // Reward credits are deliberately done once for the grouped payment, after
    // all of its installment slots have been approved.  The payment status is
    // atomically claimed by the caller, which prevents duplicate credits.
    for (const cycle of newCycles) {
      if (cycle.rewardAmount <= 0) continue;

      await Wallet.findOneAndUpdate(
        { userId: purchase.userId },
        {
          $setOnInsert: { userId: purchase.userId },
          $inc: {
            rewardBalanceFromInstallment: cycle.rewardAmount,
            totalBalance: cycle.rewardAmount,
          },
        },
        { upsert: true }
      );
      const wallet = await Wallet.findOne({ userId: purchase.userId }).lean();
      const label = cycle.cycleType === "full_payment" ? "Full payment" : "Split payment";
      const note = `${label} installment reward — Cycle #${cycle.cycleNumber}, ৳${cycle.completedAmount.toLocaleString()} target, reward ৳${cycle.rewardAmount.toLocaleString()}`;
      const transaction = await TransactionLog.create({
        userId: purchase.userId,
        type: cycle.cycleType === "full_payment"
          ? "installment_reward_one_time"
          : "installment_reward_completion",
        amount: cycle.rewardAmount,
        balanceAfter: wallet?.rewardBalanceFromInstallment ?? cycle.rewardAmount,
        note,
        relatedPurchaseId: purchase._id,
      });
      await CompanyLedger.create({
        date: new Date(),
        type: "installment_reward_paid",
        amount: cycle.rewardAmount,
        relatedId: transaction._id,
        relatedModel: "TransactionLog",
        userId: purchase.userId,
        note,
      });
    }
  } catch (err) {
    console.error(
      `[REWARD TRACKER] processRewardAfterPayment failed for purchaseId=${purchaseId}:`,
      err
    );
    // Non-critical — don't rethrow. Main transaction must not fail.
  }
};

/**
 * একটি purchase-এর RewardTracker সারসংক্ষেপ return করো।
 */
export const getRewardTrackerByPurchase = async (purchaseId: string) => {
  return await RewardTracker.findOne({ purchaseId }).lean();
};

/**
 * একজন user-এর সমস্ত RewardTracker return করো।
 */
export const getRewardTrackersByUser = async (userId: string) => {
  return await RewardTracker.find({ userId })
    .populate("purchaseId", "snapshot quantity createdAt")
    .sort({ createdAt: -1 })
    .lean();
};
