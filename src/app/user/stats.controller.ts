import { Request, Response, NextFunction } from "express";
import { User } from "./model";
import { Project } from "../project/model";
import { Purchase } from "../purchase/model";
import { Withdrawal } from "../withdrawal/model";
import { Wallet } from "../wallet/model";
import { Capital } from "../capital/model";

// ── Shared data fetcher used by both stat endpoints ───────────────────────────
async function fetchCoreStats() {
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
    // L-05 fix: include cashbackBalance and transferBalance in aggregate
    Wallet.aggregate([
      {
        $group: {
          _id: null,
          totalBalance: {
            $sum: {
              $add: [
                "$directCommissionBalance",
                "$manCommFromDownPayment",
                "$manCommFromInstallment",
                "$salaryBalanceFromRanks",
                "$cashbackBalance",
                "$transferBalance",
              ],
            },
          },
          totalDPCommission: { $sum: "$manCommFromDownPayment" },
          totalInstallmentCommission: { $sum: "$manCommFromInstallment" },
        },
      },
    ]),
  ]);

  return {
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
  };
}

// ── Superadmin: full stats including capital, admin counts ────────────────────
export const getSuperAdminStats = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const [core, totalAdmins, totalBranchManagers, capitalAgg] =
      await Promise.all([
        fetchCoreStats(),
        User.countDocuments({ role: "admin" }),
        User.countDocuments({ role: "branch_manager" }),
        Capital.aggregate([
          { $group: { _id: null, totalCapital: { $sum: "$amount" } } },
        ]),
      ]);

    res.json({
      ...core,
      totalAdmins,
      totalBranchManagers,
      totalCapital: capitalAgg[0]?.totalCapital ?? 0,
    });
  } catch (err) {
    next(err);
  }
};

// ── Admin: core stats only (no capital, no admin/branch-manager counts) ───────
export const getAdminStats = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const core = await fetchCoreStats();
    res.json(core);
  } catch (err) {
    next(err);
  }
};
