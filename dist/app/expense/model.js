"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Expense = exports.EXPENSE_CATEGORIES = void 0;
const mongoose_1 = require("mongoose");
exports.EXPENSE_CATEGORIES = [
    "office_rent",
    "salaries_staff",
    "utilities",
    "marketing",
    "software",
    "hardware",
    "travel",
    "maintenance",
    "legal",
    "miscellaneous",
];
const ExpenseSchema = new mongoose_1.Schema({
    date: { type: Date, required: true, index: true },
    category: { type: String, enum: exports.EXPENSE_CATEGORIES, required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, required: true, trim: true },
    recordedBy: { type: String, required: true },
}, { timestamps: true });
ExpenseSchema.index({ date: -1, category: 1 });
exports.Expense = (0, mongoose_1.model)("Expense", ExpenseSchema);
