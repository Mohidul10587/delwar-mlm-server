"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminExpense = void 0;
const mongoose_1 = require("mongoose");
const AdminExpenseSchema = new mongoose_1.Schema({
    submittedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, min: 1 },
    description: { type: String, required: true, trim: true },
    expenseDate: { type: Date, required: true },
    receiptImage: { type: String, default: null },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
    reviewNote: { type: String, default: "" },
    reviewedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
}, { timestamps: true });
AdminExpenseSchema.index({ submittedBy: 1, createdAt: -1 });
AdminExpenseSchema.index({ status: 1, createdAt: -1 });
exports.AdminExpense = (0, mongoose_1.model)("AdminExpense", AdminExpenseSchema);
