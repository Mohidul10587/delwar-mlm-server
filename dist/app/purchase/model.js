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
    // Legacy fixed fields – kept for backward compatibility with existing records
    nominee: { type: NomineeSchema },
    nominee2: { type: NomineeSchema },
    // New dynamic nominees array
    nominees: { type: [NomineeSchema], default: undefined },
}, { _id: false });
const SnapshotSchema = new mongoose_1.Schema({
    shareTitle: { type: String },
    shareImage: { type: String },
    cashPrice: { type: Number },
    minDownPayment: { type: Number },
    maxDownPayment: { type: Number },
    directSaleCommissionValue: { type: Number },
    downPaymentGenerationRates: [
        { generation: { type: Number }, rate: { type: Number }, _id: false },
    ],
    // Legacy flat rate — kept so old purchase records remain readable
    installmentCommissionRate: { type: Number },
    // New per-generation rates (mirrors downPaymentGenerationRates)
    installmentGenerationRates: [
        { generation: { type: Number }, rate: { type: Number }, _id: false },
    ],
    rankQualification: [
        {
            rankName: { type: String },
            order: { type: Number },
            requiredApprovedSales: { type: Number },
            _id: false,
        },
    ],
    salaryRules: [
        {
            rankName: { type: String },
            amount: { type: Number },
            durationMonths: { type: Number },
            minMonthlySales: { type: Number },
            requiredPersonalShares: { type: Number },
            _id: false,
        },
    ],
}, { _id: false });
const PurchaseSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    shareId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Project", required: true },
    quantity: { type: Number, required: true, min: 1 },
    paymentType: {
        type: String,
        enum: ["cash", "installment"],
        required: true,
    },
    paymentMethod: {
        type: String,
        enum: ["cash", "bank", "mobile_banking"],
        default: "cash",
    },
    receiptImage: { type: String, default: null },
    downPayment: { type: Number, required: true },
    installmentCount: { type: Number, required: true },
    installmentAmount: { type: Number, required: true },
    amountPaid: { type: Number, required: true },
    senderAccount: { type: String, required: true },
    transactionId: { type: String, required: true },
    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
    },
    reviewNote: { type: String, default: "" },
    reviewedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    commissionProcessed: { type: Boolean, default: false },
    buyerInfo: { type: BuyerInfoSchema, default: null },
    snapshot: { type: SnapshotSchema },
}, { timestamps: true });
// Fix D-02: Add indexes for performance and duplicate prevention
PurchaseSchema.index({ userId: 1, createdAt: -1 });
PurchaseSchema.index({ status: 1 });
PurchaseSchema.index({ transactionId: 1 }, { unique: true, sparse: true });
exports.Purchase = (0, mongoose_1.model)("Purchase", PurchaseSchema);
