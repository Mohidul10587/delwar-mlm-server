"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Purchase = void 0;
const mongoose_1 = require("mongoose");
const NomineeSchema = new mongoose_1.Schema({
    name: { type: String },
    relation: { type: String },
    phone: { type: String },
    nid: { type: String },
    image: { type: String },
}, { _id: false });
const BuyerInfoSchema = new mongoose_1.Schema({
    name: { type: String },
    phone: { type: String },
    nid: { type: String },
    nominee: { type: NomineeSchema },
    nominee2: { type: NomineeSchema },
}, { _id: false });
const PurchaseSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    shareId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Share", required: true },
    quantity: { type: Number, required: true, min: 1 },
    paymentType: { type: String, enum: ["cash", "installment"], required: true },
    amountPaid: { type: Number, required: true },
    senderAccount: { type: String, required: true },
    transactionId: { type: String, required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    reviewNote: { type: String, default: "" },
    reviewedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    commissionProcessed: { type: Boolean, default: false },
    buyerInfo: { type: BuyerInfoSchema, default: null },
}, { timestamps: true });
exports.Purchase = (0, mongoose_1.model)("Purchase", PurchaseSchema);
