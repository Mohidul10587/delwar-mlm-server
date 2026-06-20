import { Request, Response, NextFunction } from "express";
import { Investment } from "./model";
import { Settings } from "../settings/model";
import { Wallet, TransactionLog } from "../wallet/model";
import { isTransactionIdUsed } from "../../utils/isTransactionIdUsed";
import { CompanyLedger } from "../ledger/model";

const getInvestmentConfig = async () => {
  const settings = await Settings.findOne().lean();
  return (settings as any)?.investmentConfig ?? null;
};

export const createInvestment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { profitType, amount, senderAccount, transactionId, buyerInfo } = req.body;

    if (!senderAccount || !transactionId)
      return res.status(400).json({ message: "Account number and transaction ID are required" });

    if (!["monthly", "partial", "maturity"].includes(profitType))
      return res.status(400).json({ message: "Invalid profit type" });

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0)
      return res.status(400).json({ message: "Invalid investment amount" });

    const config = await getInvestmentConfig();
    if (!config)
      return res.status(404).json({ message: "Investment config not found" });

    const profitConfig = config[profitType as "monthly" | "partial" | "maturity"];
    const minAmount = profitConfig?.minAmount ?? 0;
    if (parsedAmount < minAmount)
      return res.status(400).json({ message: `Minimum investment is ৳${minAmount.toLocaleString()}` });

    const duplicate = await isTransactionIdUsed(transactionId);
    if (duplicate)
      return res.status(400).json({ message: "This transaction ID has already been used" });

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 5);

    const investment = await Investment.create({
      userId: req.user!._id,
      profitType,
      amount: parsedAmount,
      originalAmount: parsedAmount,
      senderAccount,
      transactionId,
      buyerInfo: buyerInfo ?? null,
      startDate,
      endDate,
    });

    await CompanyLedger.create({
      date: new Date(),
      type: "investment_received",
      amount: parsedAmount,
      relatedId: investment._id,
      relatedModel: "Investment",
      userId: req.user!._id,
      note: `Investment received — ${profitType} plan, ৳${parsedAmount.toLocaleString()}, TxID: ${transactionId}, Account: ${senderAccount}`,
    }).catch(() => {});

    res.status(201).json({ message: "Investment created", investment });
  } catch (err) { next(err); }
};

export const getMyInvestments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const investments = await Investment.find({ userId: req.user!._id }).sort({ createdAt: -1 }).lean();
    res.json({ investments });
  } catch (err) { next(err); }
};

export const getAllInvestments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.profitType) filter.profitType = req.query.profitType;

    const [investments, total] = await Promise.all([
      Investment.find(filter)
        .populate("userId", "name username phone")
        .sort({ createdAt: -1 })
        .skip(skip).limit(limit).lean(),
      Investment.countDocuments(filter),
    ]);

    res.json({ investments, total, page, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};

export const distributeProfit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const investment = await Investment.findById(req.params.id);
    if (!investment) return res.status(404).json({ message: "Investment not found" });
    if (investment.status === "completed") return res.status(400).json({ message: "Investment already completed" });

    const config = await getInvestmentConfig();
    if (!config) return res.status(500).json({ message: "Investment config not found" });

    const profitConfig = config[investment.profitType];
    const { customAmount } = req.body as { customAmount?: number };
    const now = new Date();

    if (investment.profitType === "maturity") {
      if (now < new Date(investment.endDate))
        return res.status(400).json({ message: "Maturity profit is only payable after the 5-year term ends" });

      const totalProfit = (investment.amount / 60) * (profitConfig.profitPercentage / 100) * 60;
      const defaultPayout = investment.amount + totalProfit;
      const totalPayout = customAmount != null && customAmount > 0 ? customAmount : defaultPayout;

      const wallet = await Wallet.findOneAndUpdate(
        { userId: investment.userId },
        { $inc: { directCommissionBalance: totalPayout } },
        { new: true, upsert: true }
      );
      await TransactionLog.create({
        userId: investment.userId, type: "admin_credit", amount: totalPayout,
        balanceAfter: wallet.directCommissionBalance,
        note: `Investment maturity payout — ৳${totalPayout.toLocaleString()} (principal ৳${investment.originalAmount.toLocaleString()} + profit ৳${(totalPayout - investment.originalAmount).toFixed(2)})`,
      });

      await CompanyLedger.create({
        date: now,
        type: "investment_profit_paid",
        amount: totalPayout,
        relatedId: investment._id,
        relatedModel: "Investment",
        userId: investment.userId,
        note: `Investment maturity payout — ৳${totalPayout.toLocaleString()} (principal ৳${investment.originalAmount.toLocaleString()} + profit ৳${(totalPayout - investment.originalAmount).toFixed(2)})`,
      }).catch(() => {});

      investment.lastProfitPaidAt = now;
      investment.lastProfitPaidMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      investment.status = "completed";
      await investment.save();

      return res.json({ message: "Maturity payout completed", profitAmount: totalPayout });
    }

    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    let calculatedProfit: number;
    if (investment.profitType === "partial") {
      const capitalReturn = (investment.originalAmount || investment.amount) / 60;
      calculatedProfit = (investment.amount * profitConfig.profitPercentage) / 100 + capitalReturn;
    } else {
      const monthlyProfit = ((investment.originalAmount || investment.amount) * profitConfig.profitPercentage) / 100;
      const isLastPayment = (investment.profitPaidCount + 1) >= 60;
      calculatedProfit = isLastPayment ? monthlyProfit + (investment.originalAmount || investment.amount) : monthlyProfit;
    }
    const profitAmount = customAmount != null && customAmount > 0 ? customAmount : calculatedProfit;

    const newProfitPaidCount = (investment.profitPaidCount || 0) + 1;
    const investmentUpdates: Record<string, unknown> = {
      lastProfitPaidAt: now,
      lastProfitPaidMonth: currentMonth,
      profitPaidCount: newProfitPaidCount,
    };
    if (investment.profitType === "partial") {
      const capitalReturn = (investment.originalAmount || investment.amount) / 60;
      const newAmount = Math.max(0, investment.amount - capitalReturn);
      investmentUpdates.amount = newAmount;
      if (newAmount === 0) investmentUpdates.status = "completed";
    }
    if (investment.profitType === "monthly" && newProfitPaidCount >= 60) {
      investmentUpdates.status = "completed";
    }

    const claimed = await Investment.findOneAndUpdate(
      { _id: investment._id, lastProfitPaidMonth: { $ne: currentMonth }, status: { $ne: "completed" } },
      { $set: investmentUpdates },
      { new: true }
    );
    if (!claimed)
      return res.status(400).json({ message: "Profit already paid this month" });

    const wallet = await Wallet.findOneAndUpdate(
      { userId: investment.userId },
      { $inc: { directCommissionBalance: profitAmount } },
      { new: true, upsert: true }
    );
    await TransactionLog.create({
      userId: investment.userId, type: "admin_credit", amount: profitAmount,
      balanceAfter: wallet.directCommissionBalance,
      note: `Investment profit — ${investment.profitType} plan, payment #${newProfitPaidCount}/60, ৳${profitAmount.toLocaleString()} (original ৳${investment.originalAmount.toLocaleString()})`,
    });

    await CompanyLedger.create({
      date: now,
      type: "investment_profit_paid",
      amount: profitAmount,
      relatedId: investment._id,
      relatedModel: "Investment",
      userId: investment.userId,
      note: `Investment profit — ${investment.profitType} plan, payment #${newProfitPaidCount}/60, ৳${profitAmount.toLocaleString()}`,
    }).catch(() => {});

    res.json({ message: "Profit distributed", profitAmount });
  } catch (err) { next(err); }
};
