import { Request, Response, NextFunction } from "express";
import { Withdrawal } from "./model";
import { Wallet, TransactionLog } from "../wallet/model";

const findOrCreateWallet = async (userId: string) => {
  return await Wallet.findOne({ userId });
};

export const createWithdrawal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { amount, method, accountDetails } = req.body;
    const amt = Number(amount);
    const wallet = await findOrCreateWallet(req.user!._id.toString());
    if (!wallet) return res.status(404).json({ message: "Wallet not found" });
    if (wallet.balance < amt)
      return res.status(400).json({ message: "Insufficient balance" });

    wallet.balance -= amt;
    await wallet.save();
    await TransactionLog.create({ userId: req.user!._id, type: "withdrawal", amount: amt, balanceAfter: wallet.balance, note: `${method}: ${accountDetails}` });

    const withdrawal = await Withdrawal.create({ userId: req.user!._id, amount: amt, method, accountDetails });
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
        wallet.balance += withdrawal.amount;
        await wallet.save();
        await TransactionLog.create({ userId: withdrawal.userId, type: "withdrawal_rejected", amount: withdrawal.amount, balanceAfter: wallet.balance, note: reviewNote || "Withdrawal rejected" });
      }
    }

    withdrawal.status = status;
    withdrawal.reviewNote = String(reviewNote ?? "").trim();
    withdrawal.reviewedBy = req.user!._id;
    withdrawal.reviewedAt = new Date();
    await withdrawal.save();

    res.json({ message: `Withdrawal ${status}`, withdrawal });
  } catch (err) { next(err); }
};
