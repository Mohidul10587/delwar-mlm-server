"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommissionDebug = void 0;
const mongoose_1 = require("mongoose");
const EntrySchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["referrer_direct", "managerial_gen"], required: true },
    generation: { type: Number },
    field: { type: String, required: true },
    before: { type: Number, required: true },
    added: { type: Number, required: true },
    after: { type: Number, required: true },
    description: { type: String, required: true },
}, { _id: false });
const CommissionDebugSchema = new mongoose_1.Schema({
    purchaseId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Purchase", required: true },
    buyerId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    buyerName: { type: String, required: true },
    buyerUsername: { type: String, required: true },
    shareTitle: { type: String, required: true },
    paymentType: { type: String, enum: ["cash", "installment"], required: true },
    approvedAmount: { type: Number, required: true },
    entries: [EntrySchema],
}, { timestamps: true });
exports.CommissionDebug = (0, mongoose_1.model)("CommissionDebug", CommissionDebugSchema);
