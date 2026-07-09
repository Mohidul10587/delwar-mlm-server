import { Wallet, TransactionLog } from "../app/wallet/model";
import { Settings } from "../app/settings/model";
import { Purchase } from "../app/purchase/model";
import { InstallmentPayment } from "../app/purchase/installment.model";

/**
 * Loads reward rules from Settings, sorted by targetAmount ascending.
 * Returns empty array if no rules configured.
 */
const getActiveRewardRules = async () => {
  const settings = await Settings.findOne({}).lean();
  if (!settings?.installmentRewardRules?.length) return [];
  return [...settings.installmentRewardRules].sort(
    (a, b) => a.targetAmount - b.targetAmount
  );
};

/**
 * Credits rewardBalance to the user's wallet and logs a TransactionLog entry.
 * Uses $inc to avoid race conditions.
 */
const creditReward = async (
  userId: string,
  amount: number,
  type: "installment_reward_one_time" | "installment_reward_completion",
  note: string,
  relatedPurchaseId: string
) => {
  await Wallet.findOneAndUpdate(
    { userId },
    { $inc: { rewardBalance: amount, totalBalance: amount } },
    { upsert: true }
  );

  const wallet = await Wallet.findOne({ userId }).lean();
  const balanceAfter = wallet?.rewardBalance ?? amount;

  await TransactionLog.create({
    userId,
    type,
    amount,
    balanceAfter,
    note,
    relatedPurchaseId,
  });
};

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
export const checkAndGrantOneTimeReward = async (
  purchaseId: string,
  userId: string,
  amountPaid: number
): Promise<void> => {
  try {
    const rules = await getActiveRewardRules();
    if (!rules.length) return;

    // Find the highest target that this payment satisfies
    const eligibleRules = rules.filter((r) => amountPaid >= r.targetAmount);
    if (!eligibleRules.length) return;
    const bestRule = eligibleRules[eligibleRules.length - 1]; // highest target

    // Idempotency: check if this exact reward was already granted for this purchase
    const alreadyGranted = await TransactionLog.findOne({
      relatedPurchaseId: purchaseId,
      type: "installment_reward_one_time",
    }).lean();
    if (alreadyGranted) return;

    await creditReward(
      userId,
      bestRule.oneTimeReward,
      "installment_reward_one_time",
      `One-time reward for ৳${amountPaid.toLocaleString()} payment — Target: ৳${bestRule.targetAmount.toLocaleString()}, Reward: ৳${bestRule.oneTimeReward.toLocaleString()}`,
      purchaseId
    );
  } catch (err) {
    console.error(`[REWARD ERROR] checkAndGrantOneTimeReward failed for purchaseId=${purchaseId}:`, err);
  }
};

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
export const checkAndGrantInstallmentReward = async (
  purchaseId: string,
  userId: string
): Promise<void> => {
  try {
    const rules = await getActiveRewardRules();
    if (!rules.length) return;

    // Calculate total verified amount paid (down payment + all approved installments)
    const purchase = await Purchase.findById(purchaseId).lean();
    if (!purchase) return;

    // amountPaid on the purchase document is the authoritative running total
    // (incremented atomically on each installment approval via $inc)
    const totalPaid = purchase.amountPaid ?? 0;
    if (totalPaid <= 0) return;

    // Find all rules whose target has been crossed by totalPaid
    const crossedRules = rules.filter((r) => totalPaid >= r.targetAmount);
    if (!crossedRules.length) return;

    // For each crossed rule, check if we already rewarded for this purchase + target
    for (const rule of crossedRules) {
      const alreadyGranted = await TransactionLog.findOne({
        relatedPurchaseId: purchaseId,
        type: "installment_reward_completion",
        note: { $regex: `Target: ৳${rule.targetAmount.toLocaleString()}` },
      }).lean();

      if (alreadyGranted) continue; // already rewarded for this threshold

      await creditReward(
        userId,
        rule.installmentCompletionReward,
        "installment_reward_completion",
        `Installment completion reward — Total paid: ৳${totalPaid.toLocaleString()}, Target: ৳${rule.targetAmount.toLocaleString()}, Reward: ৳${rule.installmentCompletionReward.toLocaleString()}`,
        purchaseId
      );
    }
  } catch (err) {
    console.error(`[REWARD ERROR] checkAndGrantInstallmentReward failed for purchaseId=${purchaseId}:`, err);
  }
};
