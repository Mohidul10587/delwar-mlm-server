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
const SnapshotSchema = new mongoose_1.Schema({
    shareTitle: { type: String },
    shareImage: { type: String },
    cashPrice: { type: Number },
    cashDownPaymentLimit: { type: Number },
    directSaleCommissionValue: { type: Number },
    downPaymentGenerationRates: [{ generation: { type: Number }, rate: { type: Number }, _id: false }],
    installmentCommissionRate: { type: Number },
    rankQualification: [{
            rankName: { type: String },
            order: { type: Number },
            requiredGeneration: { type: Number },
            requiredApprovedSales: { type: Number },
            _id: false,
        }],
    salaryRules: [{
            rankName: { type: String },
            amount: { type: Number },
            durationMonths: { type: Number },
            minMonthlySales: { type: Number },
            requiredPersonalShares: { type: Number },
            requiredPersonalPurchaseAmount: { type: Number },
            _id: false,
        }],
}, { _id: false });
const PurchaseSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    shareId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Share", required: true },
    quantity: { type: Number, required: true, min: 1 },
    paymentType: { type: String, enum: ["cash", "installment"], required: true },
    downPayment: { type: Number, required: true },
    installmentCount: { type: Number, required: true },
    installmentAmount: { type: Number, required: true },
    amountPaid: { type: Number, required: true },
    senderAccount: { type: String, required: true },
    transactionId: { type: String, required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    reviewNote: { type: String, default: "" },
    reviewedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    commissionProcessed: { type: Boolean, default: false },
    buyerInfo: { type: BuyerInfoSchema, default: null },
    snapshot: { type: SnapshotSchema, default: null },
}, { timestamps: true });
exports.Purchase = (0, mongoose_1.model)("Purchase", PurchaseSchema);
