"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAdminExpense = exports.reviewAdminExpense = exports.getAllAdminExpenses = exports.getMyAdminExpenses = exports.submitAdminExpense = void 0;
const model_1 = require("./model");
const model_2 = require("../ledger/model");
const model_3 = require("../wallet/model");
// ─── Admin Expense (approval-based) endpoints ─────────────────────────────────
// POST /expense/admin/submit — admin submits an expense for approval
const submitAdminExpense = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { amount, description, paidBy, expenseDate, receiptImage } = req.body;
        if (!amount || !description || !expenseDate) {
            return res.status(400).json({ message: "amount, description, and expenseDate are required" });
        }
        const amt = Number(amount);
        if (isNaN(amt) || amt <= 0) {
            return res.status(400).json({ message: "Amount must be greater than 0" });
        }
        const expense = yield model_1.AdminExpense.create({
            submittedBy: req.user._id,
            amount: amt,
            description: description.trim(),
            paidBy: (_a = paidBy === null || paidBy === void 0 ? void 0 : paidBy.trim()) !== null && _a !== void 0 ? _a : "",
            expenseDate: new Date(expenseDate),
            receiptImage: receiptImage !== null && receiptImage !== void 0 ? receiptImage : null,
            status: "pending",
        });
        res.status(201).json({ message: "Expense submitted for approval", expense });
    }
    catch (err) {
        next(err);
    }
});
exports.submitAdminExpense = submitAdminExpense;
// GET /expense/admin/my — admin views own expense history
const getMyAdminExpenses = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { status, page = "1", limit = "20" } = req.query;
        const filter = { submittedBy: req.user._id };
        if (status)
            filter.status = status;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [expenses, total] = yield Promise.all([
            model_1.AdminExpense.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate("reviewedBy", "name username")
                .lean(),
            model_1.AdminExpense.countDocuments(filter),
        ]);
        res.json({ expenses, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
    }
    catch (err) {
        next(err);
    }
});
exports.getMyAdminExpenses = getMyAdminExpenses;
// GET /expense/admin/all — super admin views all admin expenses
const getAllAdminExpenses = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { status, adminId, page = "1", limit = "20" } = req.query;
        const filter = {};
        if (status)
            filter.status = status;
        if (adminId)
            filter.submittedBy = adminId;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [expenses, total] = yield Promise.all([
            model_1.AdminExpense.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate("submittedBy", "name username phone role")
                .populate("reviewedBy", "name username")
                .lean(),
            model_1.AdminExpense.countDocuments(filter),
        ]);
        res.json({ expenses, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
    }
    catch (err) {
        next(err);
    }
});
exports.getAllAdminExpenses = getAllAdminExpenses;
// PATCH /expense/admin/:id/review — super admin approves or rejects an expense
// Body: { status: "approved" | "rejected", reviewNote? }
const reviewAdminExpense = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { status, reviewNote } = req.body;
        if (!status || !["approved", "rejected"].includes(status)) {
            return res.status(400).json({ message: "status must be 'approved' or 'rejected'" });
        }
        if (status === "rejected" && !(reviewNote === null || reviewNote === void 0 ? void 0 : reviewNote.trim())) {
            return res.status(400).json({ message: "reviewNote is required when rejecting an expense" });
        }
        const expense = yield model_1.AdminExpense.findById(req.params.id);
        if (!expense)
            return res.status(404).json({ message: "Expense not found" });
        if (expense.status !== "pending") {
            return res.status(400).json({ message: `Expense has already been ${expense.status}` });
        }
        expense.status = status;
        expense.reviewNote = (_a = reviewNote === null || reviewNote === void 0 ? void 0 : reviewNote.trim()) !== null && _a !== void 0 ? _a : "";
        expense.reviewedBy = req.user._id;
        expense.reviewedAt = new Date();
        yield expense.save();
        if (status === "approved") {
            // Credit wallet
            yield model_3.Wallet.findOneAndUpdate({ userId: expense.submittedBy }, {
                $inc: {
                    expenseReimbursementBalance: expense.amount,
                    totalBalance: expense.amount,
                },
            }, { upsert: true });
            const updatedWallet = yield model_3.Wallet.findOne({ userId: expense.submittedBy }).lean();
            yield model_3.TransactionLog.create({
                userId: expense.submittedBy,
                type: "expense_reimbursement",
                amount: expense.amount,
                balanceAfter: (_b = updatedWallet === null || updatedWallet === void 0 ? void 0 : updatedWallet.totalBalance) !== null && _b !== void 0 ? _b : 0,
                note: `Expense reimbursement approved: ${expense.description}`,
            });
            // Mirror to CompanyLedger as outflow (company expense).
            // We use `new + save()` instead of `create()` so that the explicit
            // createdAt/updatedAt values are honoured by Mongoose even when
            // `timestamps: true` is set on the schema.
            try {
                const ledgerDoc = new model_2.CompanyLedger({
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
                yield ledgerDoc.save({ timestamps: false });
            }
            catch (ledgerErr) {
                console.error(`[LEDGER ERROR] expense_recorded for adminExpenseId=${expense._id}:`, ledgerErr);
            }
        }
        res.json({ message: `Expense ${status}`, expense });
    }
    catch (err) {
        next(err);
    }
});
exports.reviewAdminExpense = reviewAdminExpense;
// DELETE /expense/admin/:id — super admin deletes an admin expense (only pending)
const deleteAdminExpense = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const expense = yield model_1.AdminExpense.findById(req.params.id);
        if (!expense)
            return res.status(404).json({ message: "Expense not found" });
        if (expense.status === "approved") {
            return res.status(400).json({ message: "Cannot delete an approved expense. Wallet has already been updated." });
        }
        yield expense.deleteOne();
        res.json({ message: "Expense deleted" });
    }
    catch (err) {
        next(err);
    }
});
exports.deleteAdminExpense = deleteAdminExpense;
