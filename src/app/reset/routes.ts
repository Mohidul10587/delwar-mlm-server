import { Router, Request, Response } from "express";
import { Purchase } from "../purchase/model";
import { InstallmentPayment } from "../purchase/installment.model";
import { Certificate } from "../certificate/model";
import { Wallet, TransactionLog } from "../wallet/model";
import { User } from "../user/model";
import { RankSalaryLog } from "../rank/salary-log.model";
import { CompanyLedger } from "../ledger/model";
import { ShareSlot } from "../project/shareSlot.model";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ message: "Not allowed in production" });
  }

  try {
    await Promise.all([
      Purchase.deleteMany({}),
      InstallmentPayment.deleteMany({}),
      Certificate.deleteMany({}),
      TransactionLog.deleteMany({}),
      RankSalaryLog.deleteMany({}),
      CompanyLedger.deleteMany({}),
      Wallet.updateMany({}, {
        $set: {
          directCommissionBalance: 0,
          manCommFromDownPayment: 0,
          manCommFromInstallment: 0,
          salaryBalance: 0,
          rewardBalance: 0,
          incentiveBonus: 0,
          transferBalance: 0,
          loanBalance: 0,
          adminMonthlySalaryBalance: 0,
          expenseReimbursementBalance: 0,
          totalBalance: 0,
        },
      }),
      User.updateMany({}, {
        $set: {
          currentRank: null,
          currentRankAchievedAt: null,
          earnedRanks: [],
          directSalesCount: 0,
          teamSalesCount: 0,
          personalPurchaseCount: 0,
        },
      }),
      ShareSlot.updateMany({}, {
        $set: {
          status: "available",
          userId: null,
          purchaseId: null,
          reclaimedAt: null,
        },
      }),
    ]);

    return res.json({ message: "Full reset complete" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ message: `Reset failed: ${message}` });
  }
});

export default router;
