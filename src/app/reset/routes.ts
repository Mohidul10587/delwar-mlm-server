import { Router, Request, Response } from "express";
import { Purchase } from "../purchase/model";
import { InstallmentPayment } from "../purchase/installment.model";
import { Certificate } from "../certificate/model";
import { Wallet, TransactionLog } from "../wallet/model";
import { User } from "../user/model";
import { RankSalaryLog } from "../rank/salary-log.model";
import { CompanyLedger } from "../ledger/model";
import { ShareSlot } from "../project/shareSlot.model";
import { Settings } from "../settings/model";
import { RewardTracker } from "../reward-tracker/model";
import { Withdrawal } from "../withdrawal/model";
import { AdminExpense } from "../expense/model";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ message: "Not allowed in production" });
  }

  try {
    // Resolve first rank name before resetting users
    const settings = await Settings.findOne().select("ranks").lean();
    const firstRankName: string | null =
      Array.isArray((settings as any)?.ranks) &&
      (settings as any).ranks.length > 0
        ? (settings as any).ranks[0].name
        : null;

    const rankResetFields = firstRankName
      ? {
          currentRank: firstRankName,
          currentRankAchievedAt: new Date(),
          earnedRanks: [firstRankName],
        }
      : {
          currentRank: null,
          currentRankAchievedAt: null,
          earnedRanks: [],
        };

    await Promise.all([
      Purchase.deleteMany({}),
      InstallmentPayment.deleteMany({}),
      RewardTracker.deleteMany({}),
      Certificate.deleteMany({}),
      TransactionLog.deleteMany({}),
      RankSalaryLog.deleteMany({}),
      CompanyLedger.deleteMany({}),
      Withdrawal.deleteMany({}),
      AdminExpense.deleteMany({}),
      Wallet.updateMany(
        {},
        {
          $set: {
            directCommissionBalance: 0,
            manCommFromDownPayment: 0,
            manCommFromInstallment: 0,
            salaryBalanceFromRanks: 0,
            cashbackBalance: 0,
            transferBalance: 0,
            loanAmount: 0,
            fixedMonthlySalaryForAdminOnly: 0,
            expenseReimbursementBalance: 0,
            rewardBalanceFromInstallment: 0,
            totalBalance: 0,
          },
        }
      ),
      User.updateMany(
        {},
        {
          $set: {
            ...rankResetFields,
            directSalesCount: 0,
            teamSalesCount: 0,
            personalPurchaseCount: 0,
          },
        }
      ),
      ShareSlot.updateMany(
        {},
        {
          $set: {
            status: "available",
            userId: null,
            purchaseId: null,
            reclaimedAt: null,
          },
        }
      ),
    ]);

    return res.json({ message: "Full reset complete" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ message: `Reset failed: ${message}` });
  }
});

export default router;
