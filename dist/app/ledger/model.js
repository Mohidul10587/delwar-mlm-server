"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyLedger = exports.OUTFLOW_TYPES = exports.INFLOW_TYPES = void 0;
const mongoose_1 = require("mongoose");
exports.INFLOW_TYPES = [
    "purchase_received",
    "installment_received",
    "investment_received",
];
exports.OUTFLOW_TYPES = [
    "commission_paid",
    "salary_paid",
    "reward_paid",
    "investment_profit_paid",
    "withdrawal_paid",
];
const CompanyLedgerSchema = new mongoose_1.Schema({
    date: { type: Date, required: true, index: true },
    type: { type: String, enum: [...exports.INFLOW_TYPES, ...exports.OUTFLOW_TYPES], required: true, index: true },
    amount: { type: Number, required: true },
    relatedId: { type: mongoose_1.Schema.Types.ObjectId },
    relatedModel: { type: String },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    note: { type: String, default: "" },
}, { timestamps: true });
CompanyLedgerSchema.index({ date: 1, type: 1 });
// Dedup guard only for inflow types (one ledger row per source document)
CompanyLedgerSchema.index({ relatedId: 1, type: 1 }, { unique: true, sparse: true, partialFilterExpression: { type: { $in: ["purchase_received", "installment_received", "investment_received", "withdrawal_paid"] } } });
exports.CompanyLedger = (0, mongoose_1.model)("CompanyLedger", CompanyLedgerSchema);
