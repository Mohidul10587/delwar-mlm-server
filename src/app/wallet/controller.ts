import { Request, Response, NextFunction } from "express";
import { Wallet, TransactionLog } from "./model";

const findOrCreate = async (userId: string) => {
  let wallet = await Wallet.findOne({ userId });
  if (!wallet)
    wallet = await Wallet.create({
      userId,
      totalBalance: 0,
      directCommissionBalance: 0,
      manCommFromDownPayment: 0,
      manCommFromInstallment: 0,
      salaryBalance: 0,
      rewardBalance: 0,
    });
  return wallet;
};

export const getMyWallet = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const wallet = await findOrCreate(req.user!._id.toString());
    const transactions = await TransactionLog.find({ userId: req.user!._id })
      .sort({ createdAt: -1 }).limit(20).lean();
    res.json({ wallet, transactions });
  } catch (err) { next(err); }
};

export const getWalletByUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const wallet = await findOrCreate(req.params.userId);
    const transactions = await TransactionLog.find({ userId: req.params.userId })
      .sort({ createdAt: -1 }).limit(50).lean();
    res.json({ wallet, transactions });
  } catch (err) { next(err); }
};

export const adminCredit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { amount, note } = req.body;
    const wallet = await findOrCreate(req.params.userId);
    if (!wallet) return res.status(404).json({ message: "Wallet not found" });
    wallet.directCommissionBalance += Number(amount);
    await wallet.save();
    await TransactionLog.create({ userId: req.params.userId, type: "admin_credit", amount, balanceAfter: wallet.directCommissionBalance, note: note || "" });
    res.json({ message: "Credited", wallet });
  } catch (err) { next(err); }
};

export const adminDebit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { amount, note } = req.body;
    const wallet = await findOrCreate(req.params.userId);
    if (!wallet) return res.status(404).json({ message: "Wallet not found" });
    wallet.directCommissionBalance = Math.max(0, wallet.directCommissionBalance - Number(amount));
    await wallet.save();
    await TransactionLog.create({ userId: req.params.userId, type: "admin_debit", amount, balanceAfter: wallet.directCommissionBalance, note: note || "" });
    res.json({ message: "Debited", wallet });
  } catch (err) { next(err); }
};
