import { Request, Response, NextFunction } from "express";
import { AdminExpense } from "./model";
import { CompanyLedger } from "../ledger/model";
import { Wallet, TransactionLog } from "../wallet/model";

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

      // Mirror to CompanyLedger as outflow (company expense).
      // We use `new + save()` instead of `create()` so that the explicit
      // createdAt/updatedAt values are honoured by Mongoose even when
      // `timestamps: true` is set on the schema.
      try {
        const ledgerDoc = new CompanyLedger({
          date: expense.expenseDate,
          type: "expense_recorded",
          amount: expense.amount,
          relatedId: expense._id,
          relatedModel: "Expense",
          userId: expense.submittedBy,
          note: expense.description,
          createdAt: expense.expenseDate,
          updatedAt: expense.expenseDate,
        });
        // Bypass Mongoose auto-timestamp so our explicit dates are preserved
        await ledgerDoc.save({ timestamps: false });
      } catch (ledgerErr) {
        console.error(`[LEDGER ERROR] expense_recorded for adminExpenseId=${expense._id}:`, ledgerErr);
      }
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
