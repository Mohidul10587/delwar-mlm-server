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
  isFirstPayment = false
): Promise<void> => {
  try {
    const purchase = await Purchase.findById(purchaseId).lean();
    if (!purchase) return;

    const settings = await Settings.findOne().lean();
    const rules = (settings as any)?.installmentRewardRules ?? [];

    // Settings-এ targetAmount: 100000 (১ লক্ষ) এর রুল খুঁজি
    // Default: প্রথম রুলটি ব্যবহার করি। যদি না থাকে, reward system নিষ্ক্রিয়।
    if (!rules || rules.length === 0) return;

    // সবচেয়ে ছোট targetAmount-এর রুল — এটাই cycle target
    const sortedRules = [...rules].sort(
      (a: any, b: any) => a.targetAmount - b.targetAmount
    );
    const primaryRule = sortedRules[0];
    const cycleTargetAmount: number = primaryRule.targetAmount;
    const fullPaymentRewardAmount: number = primaryRule.oneTimeReward ?? 0;
    const splitPaymentRewardAmount: number =
      primaryRule.installmentCompletionReward ?? 0;

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
        fullPaymentRewardAmount,
        splitPaymentRewardAmount,
      });
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
        status: "pending",
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
    tracker.markModified("cycles");
    await tracker.save();
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
