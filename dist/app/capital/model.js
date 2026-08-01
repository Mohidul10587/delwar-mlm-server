"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Capital = void 0;
const mongoose_1 = require("mongoose");
const CapitalSchema = new mongoose_1.Schema({
    date: { type: Date, required: true, index: true },
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0.01 },
    paymentInfo: { type: String, default: "", trim: true },
    paidBy: { type: String, default: "", trim: true, index: true },
    voucherNo: { type: String, default: "", trim: true, index: true },
    document: { type: String, default: "" },
    ledgerId: { type: mongoose_1.Schema.Types.ObjectId, ref: "CompanyLedger", required: true, unique: true },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });
CapitalSchema.index({ date: -1, createdAt: -1 });
exports.Capital = (0, mongoose_1.model)("Capital", CapitalSchema);
