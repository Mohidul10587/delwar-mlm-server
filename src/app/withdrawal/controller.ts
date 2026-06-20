import { Request, Response, NextFunction } from "express";
import { Withdrawal } from "./model";
import { Wallet, TransactionLog } from "../wallet/model";
import { CompanyLedger } from "../ledger/model";

const findOrCreateWallet = async (userId: string) => {
  return await Wallet.findOne({ userId });
};

export const createWithdrawal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { amount, method, accountDetails, branch } = req.body;
    const amt = Number(amount);

    if (method === "branch" && !branch)
      return res.status(400).json({ message: "Branch is required" });
    if (method !== "branch" && !accountDetails)
      return res.status(400).json({ message: "Account details required" });

    const wallet = await findOrCreateWallet(req.user!._id.toString());
    if (!wallet) return res.status(404).json({ message: "Wallet not found" });
    if (wallet.totalBalance < amt)
      return res.status(400).json({ message: "Insufficient balance" });

    // Deduct sequentially from available balances
    let remaining = amt;
    const fields: (keyof typeof wallet)[] = ["directCommissionBalance", "manCommFromDownPayment", "manCommFromInstallment", "salaryBalance", "rewardBalance"];
    for (const field of fields) {
      if (remaining <= 0) break;
      const available = wallet[field] as number;
      const deduct = Math.min(available, remaining);
      (wallet[field] as number) -= deduct;
      remaining -= deduct;
    }
    await wallet.save();
    const noteDetail = method === "branch" ? `Branch: ${branch}` : `${method}: ${accountDetails}`;
    await TransactionLog.create({ userId: req.user!._id, type: "withdrawal", amount: amt, balanceAfter: wallet.totalBalance, note: noteDetail });

    const withdrawal = await Withdrawal.create({
      userId: req.user!._id, amount: amt, method,
      accountDetails: method === "branch" ? "" : accountDetails,
      branch: method === "branch" ? branch : undefined,
    });
    res.status(201).json({ message: "Withdrawal request submitted", withdrawal });
  } catch (err) { next(err); }
};

export const getWithdrawals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const withdrawals = await Withdrawal.find()
      .populate("userId", "name username phone")
      .sort({ createdAt: -1 }).lean();
    res.json({ withdrawals });
  } catch (err) { next(err); }
};

export const getMyWithdrawals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const withdrawals = await Withdrawal.find({ userId: req.user!._id }).sort({ createdAt: -1 }).lean();
    res.json({ withdrawals });
  } catch (err) { next(err); }
};

export const updateWithdrawalStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, reviewNote } = req.body;
    if (!["approved", "rejected"].includes(status))
      return res.status(400).json({ message: "Invalid status" });

    const withdrawal = await Withdrawal.findById(req.params.id);
    if (!withdrawal)
      return res.status(404).json({ message: "Withdrawal not found" });
    if (withdrawal.status !== "pending")
      return res.status(400).json({ message: "Already reviewed" });

    if (status === "rejected") {
      const wallet = await findOrCreateWallet(withdrawal.userId.toString());
      if (wallet) {
        wallet.directCommissionBalance += withdrawal.amount;
        await wallet.save();
        await TransactionLog.create({ userId: withdrawal.userId, type: "withdrawal_rejected", amount: withdrawal.amount, balanceAfter: wallet.totalBalance, note: reviewNote || "Withdrawal rejected" });
      }
    }

    withdrawal.status = status;
    withdrawal.reviewNote = String(reviewNote ?? "").trim();
    withdrawal.reviewedBy = req.user!._id;
    withdrawal.reviewedAt = new Date();
    await withdrawal.save();

    // Ledger: approved withdrawal = outflow
    if (status === "approved") {
      await CompanyLedger.create({
        date: new Date(),
        type: "withdrawal_paid",
        amount: withdrawal.amount,
        relatedId: withdrawal._id,
        relatedModel: "Withdrawal",
        userId: withdrawal.userId,
        note: `Withdrawal approved — ${withdrawal.method}`,
      }).catch(() => {});
    }

    res.json({ message: `Withdrawal ${status}`, withdrawal });
  } catch (err) { next(err); }
};
