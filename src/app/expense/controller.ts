import { Request, Response, NextFunction } from "express";
import { Expense, EXPENSE_CATEGORIES } from "./model";
import { CompanyLedger } from "../ledger/model";

// POST /expense — record a new expense
export const createExpense = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date, category, amount, description } = req.body;

    if (!date || !category || !amount || !description) {
      return res.status(400).json({ message: "date, category, amount, and description are required" });
    }

    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0" });
    }

    if (!EXPENSE_CATEGORIES.includes(category)) {
      return res.status(400).json({ message: "Invalid expense category" });
    }

    const expense = await Expense.create({
      date: new Date(date),
      category,
      amount: amt,
      description: description.trim(),
      recordedBy: req.user!.username,
    });

    // Mirror to CompanyLedger as outflow
    try {
      await CompanyLedger.create({
        date: new Date(date),
        type: "expense_recorded",
        amount: amt,
        relatedId: expense._id,
        relatedModel: "Expense",
        note: `[${category}] ${description.trim()}`,
      });
    } catch (ledgerErr) {
      console.error(`[LEDGER ERROR] expense_recorded for expenseId=${expense._id}:`, ledgerErr);
    }

    res.status(201).json({ message: "Expense recorded", expense });
  } catch (err) { next(err); }
};

// GET /expense — paginated list with filters
export const getExpenses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, from, to, page = "1", limit = "30" } = req.query as Record<string, string>;

    const filter: Record<string, unknown> = {};
    if (category) filter.category = category;
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

    const [expenses, total, summary] = await Promise.all([
      Expense.find(filter).sort({ date: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Expense.countDocuments(filter),
      Expense.aggregate([
        { $match: filter },
        { $group: { _id: null, totalAmount: { $sum: "$amount" } } },
      ]),
    ]);

    res.json({
      expenses,
      total,
      totalAmount: summary[0]?.totalAmount ?? 0,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) { next(err); }
};

// DELETE /expense/:id — delete a single expense and its ledger entry
export const deleteExpense = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) return res.status(404).json({ message: "Expense not found" });

    // Remove corresponding ledger entry
    await CompanyLedger.deleteOne({ relatedId: expense._id, type: "expense_recorded" });

    res.json({ message: "Expense deleted" });
  } catch (err) { next(err); }
};
