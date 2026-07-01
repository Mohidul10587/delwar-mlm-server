"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Investment = void 0;
const mongoose_1 = require("mongoose");
const InvestmentSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    profitType: { type: String, enum: ["monthly", "partial", "maturity"], required: true },
    amount: { type: Number, required: true },
    originalAmount: { type: Number, required: true },
    profitPaidCount: { type: Number, default: 0 },
    senderAccount: { type: String, required: true },
    transactionId: { type: String, required: true },
    buyerInfo: { type: mongoose_1.Schema.Types.Mixed, default: null },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, required: true },
    lastProfitPaidAt: { type: Date, default: null },
    lastProfitPaidMonth: { type: String, default: null },
    status: { type: String, enum: ["active", "completed"], default: "active" },
}, { timestamps: true });
// Fix D-05: Unique index on transactionId — DB-level duplicate prevention
InvestmentSchema.index({ transactionId: 1 }, { unique: true });
InvestmentSchema.index({ userId: 1, createdAt: -1 });
exports.Investment = (0, mongoose_1.model)("Investment", InvestmentSchema);
