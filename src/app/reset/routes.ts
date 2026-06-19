import { Router, Request, Response } from "express";
import { Purchase } from "../purchase/model";
import { InstallmentPayment } from "../purchase/installment.model";
import { Certificate } from "../certificate/model";
import { Wallet, TransactionLog } from "../wallet/model";
import { User } from "../user/model";
import { RankSalaryLog } from "../rank/salary-log.model";

const router = Router();

router.get("/full", async (_req: Request, res: Response) => {
  await Promise.all([
    Purchase.deleteMany({}),
    InstallmentPayment.deleteMany({}),
    Certificate.deleteMany({}),
    TransactionLog.deleteMany({}),
    RankSalaryLog.deleteMany({}),
    Wallet.updateMany(
      {},
      {
        balance: 0,
        managerialCommissionBalance: 0,
        directCommissionBalance: 0,
        salaryBalance: 0,
        rewardBalance: 0,
      }
    ),
    User.updateMany(
      {},
      {
        currentRank: null,
        currentRankAchievedAt: null,
        earnedRanks: [],
        directSalesCount: 0,
        teamSalesCount: 0,
        personalSharesCount: 0,
      }
    ),
  ]);
  res.json({ message: "Full reset complete" });
});

export default router;
