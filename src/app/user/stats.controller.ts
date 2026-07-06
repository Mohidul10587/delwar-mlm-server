import { Request, Response, NextFunction } from "express";
import { User } from "./model";
import { Project } from "../project/model";
import { Purchase } from "../purchase/model";
import { Withdrawal } from "../withdrawal/model";
import { Wallet } from "../wallet/model";

// H-07 fix: added try/catch and next(err)
export const getSuperAdminStats = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalShares,
      totalPurchases,
      pendingPurchases,
      approvedPurchases,
      pendingWithdrawals,
      approvedWithdrawals,
      walletAgg,
    ] = await Promise.all([
      User.countDocuments({ role: "user" }),
      User.countDocuments({ role: "user", isActive: true }),
      Project.countDocuments(),
      Purchase.countDocuments(),
      Purchase.countDocuments({ status: "pending" }),
      Purchase.countDocuments({ status: "approved" }),
      Withdrawal.countDocuments({ status: "pending" }),
      Withdrawal.countDocuments({ status: "approved" }),
      // L-05 fix: include incentiveBonus and transferBalance in aggregate
      Wallet.aggregate([{
        $group: {
          _id: null,
          totalBalance: {
            $sum: {
              $add: [
                "$directCommissionBalance",
                "$manCommFromDownPayment",
                "$manCommFromInstallment",
                "$salaryBalance",
                "$rewardBalance",
                "$incentiveBonus",
                "$transferBalance",
              ],
            },
          },
          totalDPCommission: { $sum: "$manCommFromDownPayment" },
          totalInstallmentCommission: { $sum: "$manCommFromInstallment" },
        },
      }]),
    ]);

    res.json({
      totalUsers,
      activeUsers,
      totalShares,
      totalPurchases,
      pendingPurchases,
      approvedPurchases,
      pendingWithdrawals,
      approvedWithdrawals,
      totalWalletBalance: walletAgg[0]?.totalBalance ?? 0,
      totalManCommFromDownPayment: walletAgg[0]?.totalDPCommission ?? 0,
      totalManCommFromInstallment: walletAgg[0]?.totalInstallmentCommission ?? 0,
    });
  } catch (err) {
    next(err);
  }
};
