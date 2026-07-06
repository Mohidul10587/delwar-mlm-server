import { Request, Response, NextFunction } from "express";
import { Expense, EXPENSE_CATEGORIES, AdminExpense } from "./model";
import { CompanyLedger } from "../ledger/model";
import { Wallet, TransactionLog } from "../wallet/model";

// ─── Legacy expense endpoints (company-level, super-admin only) ──────────────

// POST /expense — record a new legacy expense
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

// GET /expense — paginated legacy expense list with filters
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

// DELETE /expense/:id — delete a legacy expense
export const deleteExpense = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) return res.status(404).json({ message: "Expense not found" });

    // Remove corresponding ledger entry
    await CompanyLedger.deleteOne({ relatedId: expense._id, type: "expense_recorded" });

    res.json({ message: "Expense deleted" });
  } catch (err) { next(err); }
};

// ─── Admin Expense (approval-based) endpoints ─────────────────────────────────

// POST /expense/admin/submit — admin submits an expense for approval
export const submitAdminExpense = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { amount, description, expenseDate, receiptImage } = req.body;

    if (!amount || !description || !expenseDate) {
      return res.status(400).json({ message: "amount, description, and expenseDate are required" });
    }
    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0" });
    }

    const expense = await AdminExpense.create({
      submittedBy: req.user!._id,
      amount: amt,
      description: description.trim(),
      expenseDate: new Date(expenseDate),
      receiptImage: receiptImage ?? null,
      status: "pending",
    });

    res.status(201).json({ message: "Expense submitted for approval", expense });
  } catch (err) { next(err); }
};

// GET /expense/admin/my — admin views own expense history
export const getMyAdminExpenses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, page = "1", limit = "20" } = req.query as Record<string, string>;
    const filter: any = { submittedBy: req.user!._id };
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [expenses, total] = await Promise.all([
      AdminExpense.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("reviewedBy", "name username")
        .lean(),
      AdminExpense.countDocuments(filter),
    ]);

    res.json({ expenses, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) { next(err); }
};

// GET /expense/admin/all — super admin views all admin expenses
export const getAllAdminExpenses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, adminId, page = "1", limit = "20" } = req.query as Record<string, string>;
    const filter: any = {};
    if (status) filter.status = status;
    if (adminId) filter.submittedBy = adminId;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [expenses, total] = await Promise.all([
      AdminExpense.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("submittedBy", "name username phone role")
        .populate("reviewedBy", "name username")
        .lean(),
      AdminExpense.countDocuments(filter),
    ]);

    res.json({ expenses, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) { next(err); }
};

// PATCH /expense/admin/:id/review — super admin approves or rejects an expense
// Body: { status: "approved" | "rejected", reviewNote? }
export const reviewAdminExpense = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, reviewNote } = req.body;
    if (!status || !["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "status must be 'approved' or 'rejected'" });
    }
    if (status === "rejected" && !reviewNote?.trim()) {
      return res.status(400).json({ message: "reviewNote is required when rejecting an expense" });
    }

    const expense = await AdminExpense.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: "Expense not found" });
    if (expense.status !== "pending") {
      return res.status(400).json({ message: `Expense has already been ${expense.status}` });
    }

    expense.status = status;
    expense.reviewNote = reviewNote?.trim() ?? "";
    expense.reviewedBy = req.user!._id as any;
    expense.reviewedAt = new Date();
    await expense.save();

    if (status === "approved") {
      // Credit wallet
      await Wallet.findOneAndUpdate(
        { userId: expense.submittedBy },
        {
          $inc: {
            expenseReimbursementBalance: expense.amount,
            totalBalance: expense.amount,
          },
        },
        { upsert: true }
      );

      const updatedWallet = await Wallet.findOne({ userId: expense.submittedBy }).lean();

      await TransactionLog.create({
        userId: expense.submittedBy,
        type: "expense_reimbursement",
        amount: expense.amount,
        balanceAfter: updatedWallet?.totalBalance ?? 0,
        note: `Expense reimbursement approved: ${expense.description}`,
      });
    }

    res.json({ message: `Expense ${status}`, expense });
  } catch (err) { next(err); }
};

// DELETE /expense/admin/:id — super admin deletes an admin expense (only pending)
export const deleteAdminExpense = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const expense = await AdminExpense.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: "Expense not found" });
    if (expense.status === "approved") {
      return res.status(400).json({ message: "Cannot delete an approved expense. Wallet has already been updated." });
    }
    await expense.deleteOne();
    res.json({ message: "Expense deleted" });
  } catch (err) { next(err); }
};
