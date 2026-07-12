import { Request, Response, NextFunction } from "express";
import { Wallet, TransactionLog } from "./model";
import { CompanyLedger } from "../ledger/model";
import { findOrCreateWallet } from "../../utils/walletUtils";

export const getMyWallet = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const wallet = await findOrCreateWallet(req.user!._id.toString());
    const transactions = await TransactionLog.find({ userId: req.user!._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    res.json({ wallet, transactions });
  } catch (err) {
    next(err);
  }
};

export const getWalletByUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const wallet = await findOrCreateWallet(req.params.userId);
    const transactions = await TransactionLog.find({
      userId: req.params.userId,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ wallet, transactions });
  } catch (err) {
    next(err);
  }
};

export const getMyTransactions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 30;
    const skip = (page - 1) * limit;

    const filter: any = { userId: req.user!._id };

    if (req.query.type) filter.type = req.query.type;

    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate)
        filter.createdAt.$gte = new Date(req.query.startDate as string);
      if (req.query.endDate) {
        const end = new Date(req.query.endDate as string);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const [transactions, total] = await Promise.all([
      TransactionLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      TransactionLog.countDocuments(filter),
    ]);
    res.json({ transactions, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

export const adminCredit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { amount, note } = req.body;

    // Fix V-02: validate amount
    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0" });
    }

    // Fix F-12: atomic $inc keeps totalBalance consistent
    const wallet = await Wallet.findOneAndUpdate(
      { userId: req.params.userId },
      { $inc: { directCommissionBalance: amt, totalBalance: amt } },
      { new: true, upsert: true }
    );

    await TransactionLog.create({
      userId: req.params.userId,
      type: "admin_credit",
      amount: amt,
      balanceAfter: wallet.totalBalance,
      note: note || "",
    });

    res.json({ message: "Credited", wallet });
  } catch (err) {
    next(err);
  }
};

export const adminDebit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { amount, note } = req.body;

    // Fix V-02: validate amount
    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0" });
    }

    const wallet = await Wallet.findOne({ userId: req.params.userId });
    if (!wallet) return res.status(404).json({ message: "Wallet not found" });

    // Prevent debit below zero
    const deductable = Math.min(amt, wallet.directCommissionBalance);

    // Fix F-12: atomic $inc
    const updated = await Wallet.findOneAndUpdate(
      { userId: req.params.userId },
      {
        $inc: {
          directCommissionBalance: -deductable,
          totalBalance: -deductable,
        },
      },
      { new: true }
    );

    await TransactionLog.create({
      userId: req.params.userId,
      type: "admin_debit",
      amount: deductable,
      balanceAfter: updated!.totalBalance,
      note: note || "",
    });

    res.json({ message: "Debited", wallet: updated });
  } catch (err) {
    next(err);
  }
};

export const adminGiveIncentiveBonus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { amount, note } = req.body;

    // Fix V-02: validate amount
    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0" });
    }

    // Fix F-12: atomic $inc keeps totalBalance consistent
    const wallet = await Wallet.findOneAndUpdate(
      { userId: req.params.userId },
      { $inc: { cashbackBalance: amt, totalBalance: amt } },
      { new: true, upsert: true }
    );

    await TransactionLog.create({
      userId: req.params.userId,
      type: "incentive_bonus",
      amount: amt,
      balanceAfter: wallet.totalBalance,
      note: note || "Incentive bonus granted by admin",
    });

    try {
      await CompanyLedger.create({
        date: new Date(),
        type: "incentive_bonus_paid",
        amount: amt,
        userId: req.params.userId,
        note: note || "Incentive bonus granted by admin",
      });
    } catch (ledgerErr) {
      console.error(
        `[LEDGER ERROR] incentive_bonus_paid for userId=${req.params.userId}:`,
        ledgerErr
      );
    }

    res.json({ message: "Incentive bonus granted successfully", wallet });
  } catch (err) {
    next(err);
  }
};

// Admin loan balance adjustment: positive amount = give loan, negative = deduct from loan
export const adminAdjustLoanBalance = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { amount, note } = req.body;

    const amt = Number(amount);
    if (isNaN(amt) || amt === 0) {
      return res
        .status(400)
        .json({ message: "Amount must be a non-zero number" });
    }

    const wallet = await Wallet.findOne({ userId: req.params.userId });
    if (!wallet) return res.status(404).json({ message: "Wallet not found" });

    // Prevent loan balance from going below zero
    const currentLoan = wallet.loanBalance ?? 0;
    if (amt < 0 && Math.abs(amt) > currentLoan) {
      return res.status(400).json({
        message: `Cannot deduct ৳${Math.abs(
          amt
        )} — current loan balance is only ৳${currentLoan}`,
      });
    }

    const transactionType = amt > 0 ? "loan_given" : "loan_adjusted";

    // loanBalance is tracked separately, not added to totalBalance
    const updated = await Wallet.findOneAndUpdate(
      { userId: req.params.userId },
      { $inc: { loanBalance: amt } },
      { new: true, upsert: true }
    );

    await TransactionLog.create({
      userId: req.params.userId,
      type: transactionType,
      amount: Math.abs(amt),
      balanceAfter: updated!.loanBalance,
      note:
        note ||
        (amt > 0 ? "Loan given by admin" : "Loan balance adjusted by admin"),
    });

    try {
      await CompanyLedger.create({
        date: new Date(),
        type: transactionType,
        amount: Math.abs(amt),
        userId: req.params.userId,
        note:
          note ||
          (amt > 0 ? "Loan given by admin" : "Loan balance adjusted by admin"),
      });
    } catch (ledgerErr) {
      console.error(
        `[LEDGER ERROR] ${transactionType} for userId=${req.params.userId}:`,
        ledgerErr
      );
    }

    res.json({
      message: amt > 0 ? "Loan granted successfully" : "Loan balance adjusted",
      wallet: updated,
    });
  } catch (err) {
    next(err);
  }
};
