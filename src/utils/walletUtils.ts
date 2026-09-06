import { Wallet } from "../app/wallet/model";

/**
 * Shared utility — find or atomically create a wallet for a user.
 * Uses findOneAndUpdate with upsert to avoid race conditions when
 * two concurrent requests try to create the same wallet.
 */
export const findOrCreateWallet = async (userId: string) => {
  return await Wallet.findOneAndUpdate(
    { userId },
    {
      $setOnInsert: {
        userId,
        totalBalance: 0,
        directCommissionBalance: 0,
        manCommFromDownPayment: 0,
        manCommFromInstallment: 0,
        salaryBalanceFromRanks: 0,
        cashbackBalance: 0,
        transferBalance: 0,
      },
    },
    { upsert: true, new: true }
  );
};

/**
 * Round to exactly 2 decimal places using integer arithmetic to avoid
 * floating-point errors (e.g. 5000 × 0.98 = 4899.9999... in JS).
 *
 * Use this for ALL monetary calculations throughout the project.
 */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
