"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstallmentPayment = void 0;
const mongoose_1 = require("mongoose");
const InstallmentPaymentSchema = new mongoose_1.Schema({
    purchaseId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Purchase", required: true },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    installmentNo: { type: Number, required: true, min: 1 },
    amount: { type: Number, required: true, min: 1 },
    senderAccount: { type: String, required: true },
    transactionId: { type: String, required: true },
    paymentMethod: {
        type: String,
        enum: ["cash", "bank", "mobile_banking"],
        default: "cash",
    },
    receiptImage: { type: String, default: null },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    reviewNote: { type: String, default: "" },
    reviewedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
}, { timestamps: true });
// F-09: Unique index on transactionId — prevents duplicate installment submissions
InstallmentPaymentSchema.index({ transactionId: 1 }, { unique: true, sparse: true });
InstallmentPaymentSchema.index({ purchaseId: 1, installmentNo: 1 });
InstallmentPaymentSchema.index({ status: 1 }); // L-07 fix: index for pending queries
InstallmentPaymentSchema.index({ userId: 1 });
exports.InstallmentPayment = (0, mongoose_1.model)("InstallmentPayment", InstallmentPaymentSchema);
