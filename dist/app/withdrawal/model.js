"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Withdrawal = void 0;
const mongoose_1 = require("mongoose");
const WithdrawalSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, min: 1 },
    method: {
        type: String,
        enum: ["bank", "mobile", "cash", "bkash", "nagad", "rocket", "branch"],
        required: true,
    },
    bankAccount: {
        type: {
            bankName: { type: String },
            accountName: { type: String },
            accountNumber: { type: String },
            branchName: { type: String },
            routingNumber: { type: String },
        },
        default: null,
    },
    mobileType: {
        type: String,
        enum: ["bkash", "nagad", "rocket"],
        default: null,
    },
    mobileNumber: { type: String, default: null },
    mobileAccountName: { type: String, default: null },
    accountDetails: { type: String, default: "" },
    branch: { type: String },
    branchId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Branch", default: null },
    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
    },
    reviewNote: { type: String, default: "" },
    reviewedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    deductionBreakdown: { type: mongoose_1.Schema.Types.Mixed, default: null },
}, { timestamps: true });
exports.Withdrawal = (0, mongoose_1.model)("Withdrawal", WithdrawalSchema);
