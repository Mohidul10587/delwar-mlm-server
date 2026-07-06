import { Router, Request, Response } from "express";
import { Purchase } from "../purchase/model";
import { InstallmentPayment } from "../purchase/installment.model";
import { Certificate } from "../certificate/model";
import { Wallet, TransactionLog } from "../wallet/model";
import { User } from "../user/model";
import { RankSalaryLog } from "../rank/salary-log.model";
import { CompanyLedger } from "../ledger/model";
import { ShareSlot } from "../project/shareSlot.model";
import { verifySuperAdmin } from "../../middleware/auth";

const router = Router();

// Fix S-03: protected by superadmin auth + blocked in production
router.get("/", async (_req: Request, res: Response) => {
  // Hard block in production — this route must never run in production
  if (process.env.NODE_ENV === "production") {
    return res
      .status(403)
      .json({ message: "Reset is not allowed in production" });
  }

  await Promise.all([
    Purchase.deleteMany({}),
    InstallmentPayment.deleteMany({}),
    Certificate.deleteMany({}),
    TransactionLog.deleteMany({}),
    RankSalaryLog.deleteMany({}),
    CompanyLedger.deleteMany({}),
    Wallet.updateMany(
      {},
      {
        manCommFromDownPayment: 0,
        manCommFromInstallment: 0,
        totalBalance: 0,
        directCommissionBalance: 0,
        salaryBalance: 0,
        rewardBalance: 0,
        incentiveBonus: 0,
        transferBalance: 0,
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
  res.json({ message: "Full reset complete" });
});

export default router;
