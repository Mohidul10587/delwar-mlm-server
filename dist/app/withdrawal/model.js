"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Withdrawal = void 0;
const mongoose_1 = require("mongoose");
const WithdrawalSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, min: 1 },
    method: { type: String, enum: ["bank", "bkash", "nagad", "rocket", "branch"], required: true },
    accountDetails: { type: String, default: "" },
    branch: { type: String },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    reviewNote: { type: String, default: "" },
    reviewedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    deductionBreakdown: { type: mongoose_1.Schema.Types.Mixed, default: null },
}, { timestamps: true });
exports.Withdrawal = (0, mongoose_1.model)("Withdrawal", WithdrawalSchema);
