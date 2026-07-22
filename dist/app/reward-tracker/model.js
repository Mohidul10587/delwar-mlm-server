"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RewardTracker = void 0;
const mongoose_1 = require("mongoose");
const RewardCycleSchema = new mongoose_1.Schema({
    cycleNumber: { type: Number, required: true },
    cycleType: { type: String, enum: ["full_payment", "split_payment"], required: true },
    completedAmount: { type: Number, required: true },
    completedAt: { type: Date, required: true },
    rewardAmount: { type: Number, required: true, default: 0 },
    status: { type: String, enum: ["pending", "approved", "paid", "cancelled"], default: "pending" },
    sourcePaymentId: { type: mongoose_1.Schema.Types.ObjectId, ref: "InstallmentPayment" },
    paidAt: { type: Date },
    note: { type: String, default: "" },
}, { _id: false });
const RewardTrackerSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    purchaseId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Purchase", required: true },
    cycleTargetAmount: { type: Number, required: true },
    totalPaidAmount: { type: Number, default: 0 },
    carryForwardAmount: { type: Number, default: 0 },
    completedCycles: { type: Number, default: 0 },
    cycles: { type: [RewardCycleSchema], default: [] },
    processedPaymentIds: { type: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "InstallmentPayment" }], default: [] },
    fullPaymentRewardAmount: { type: Number, default: 0 },
    splitPaymentRewardAmount: { type: Number, default: 0 },
}, { timestamps: true });
// One tracker per purchase
RewardTrackerSchema.index({ purchaseId: 1 }, { unique: true });
RewardTrackerSchema.index({ userId: 1 });
exports.RewardTracker = (0, mongoose_1.model)("RewardTracker", RewardTrackerSchema);
