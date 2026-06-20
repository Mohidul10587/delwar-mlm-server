import { Request, Response } from "express";
import { CompanyLedger, INFLOW_TYPES, OUTFLOW_TYPES } from "./model";
import { TransactionLog } from "../wallet/model";

export const getLedger = async (req: Request, res: Response) => {
  try {
    const { type, from, to, page = "1", limit = "50" } = req.query as Record<string, string>;

    const filter: Record<string, unknown> = {};
    if (type) filter.type = type;
    if (from || to) {
      filter.date = {} as Record<string, unknown>;
      if (from) (filter.date as Record<string, unknown>).$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        (filter.date as Record<string, unknown>).$lte = toDate;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [entries, total, summary] = await Promise.all([
      CompanyLedger.find(filter)
        .populate("userId", "name username phone")
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      CompanyLedger.countDocuments(filter),
      CompanyLedger.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalInflow:  { $sum: { $cond: [{ $in: ["$type", INFLOW_TYPES] },  "$amount", 0] } },
            totalOutflow: { $sum: { $cond: [{ $in: ["$type", OUTFLOW_TYPES] }, "$amount", 0] } },
          },
        },
      ]),
    ]);

    const totalInflow  = summary[0]?.totalInflow  ?? 0;
    const totalOutflow = summary[0]?.totalOutflow ?? 0;

    res.json({
      entries,
      total,
      totalInflow,
      totalOutflow,
      net: totalInflow - totalOutflow,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch {
    res.status(500).json({ message: "Failed to fetch ledger" });
  }
};

// Admin: full transaction history across all users (paginated)
export const getAllTransactions = async (req: Request, res: Response) => {
  try {
    const { userId, type, from, to, page = "1", limit = "50" } = req.query as Record<string, string>;

    const filter: Record<string, unknown> = {};
    if (userId) filter.userId = userId;
    if (type) filter.type = type;
    if (from || to) {
      filter.createdAt = {} as Record<string, unknown>;
      if (from) (filter.createdAt as Record<string, unknown>).$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        (filter.createdAt as Record<string, unknown>).$lte = toDate;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [transactions, total] = await Promise.all([
      TransactionLog.find(filter)
        .populate("userId", "name username phone")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      TransactionLog.countDocuments(filter),
    ]);

    res.json({ transactions, total, page: parseInt(page), limit: parseInt(limit) });
  } catch {
    res.status(500).json({ message: "Failed to fetch transactions" });
  }
};
