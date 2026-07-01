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
exports.deleteExpense = exports.getExpenses = exports.createExpense = void 0;
const model_1 = require("./model");
const model_2 = require("../ledger/model");
// POST /expense — record a new expense
const createExpense = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { date, category, amount, description } = req.body;
        if (!date || !category || !amount || !description) {
            return res.status(400).json({ message: "date, category, amount, and description are required" });
        }
        const amt = Number(amount);
        if (isNaN(amt) || amt <= 0) {
            return res.status(400).json({ message: "Amount must be greater than 0" });
        }
        if (!model_1.EXPENSE_CATEGORIES.includes(category)) {
            return res.status(400).json({ message: "Invalid expense category" });
        }
        const expense = yield model_1.Expense.create({
            date: new Date(date),
            category,
            amount: amt,
            description: description.trim(),
            recordedBy: req.user.username,
        });
        // Mirror to CompanyLedger as outflow
        try {
            yield model_2.CompanyLedger.create({
                date: new Date(date),
                type: "expense_recorded",
                amount: amt,
                relatedId: expense._id,
                relatedModel: "Expense",
                note: `[${category}] ${description.trim()}`,
            });
        }
        catch (ledgerErr) {
            console.error(`[LEDGER ERROR] expense_recorded for expenseId=${expense._id}:`, ledgerErr);
        }
        res.status(201).json({ message: "Expense recorded", expense });
    }
    catch (err) {
        next(err);
    }
});
exports.createExpense = createExpense;
// GET /expense — paginated list with filters
const getExpenses = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { category, from, to, page = "1", limit = "30" } = req.query;
        const filter = {};
        if (category)
            filter.category = category;
        if (from || to) {
            filter.date = {};
            if (from)
                filter.date.$gte = new Date(from);
            if (to) {
                const toDate = new Date(to);
                toDate.setHours(23, 59, 59, 999);
                filter.date.$lte = toDate;
            }
        }
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [expenses, total, summary] = yield Promise.all([
            model_1.Expense.find(filter).sort({ date: -1 }).skip(skip).limit(parseInt(limit)).lean(),
            model_1.Expense.countDocuments(filter),
            model_1.Expense.aggregate([
                { $match: filter },
                { $group: { _id: null, totalAmount: { $sum: "$amount" } } },
            ]),
        ]);
        res.json({
            expenses,
            total,
            totalAmount: (_b = (_a = summary[0]) === null || _a === void 0 ? void 0 : _a.totalAmount) !== null && _b !== void 0 ? _b : 0,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
        });
    }
    catch (err) {
        next(err);
    }
});
exports.getExpenses = getExpenses;
// DELETE /expense/:id — delete a single expense and its ledger entry
const deleteExpense = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const expense = yield model_1.Expense.findByIdAndDelete(req.params.id);
        if (!expense)
            return res.status(404).json({ message: "Expense not found" });
        // Remove corresponding ledger entry
        yield model_2.CompanyLedger.deleteOne({ relatedId: expense._id, type: "expense_recorded" });
        res.json({ message: "Expense deleted" });
    }
    catch (err) {
        next(err);
    }
});
exports.deleteExpense = deleteExpense;
