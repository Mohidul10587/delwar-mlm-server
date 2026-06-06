"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AffiliateCommission = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const AffiliateCommissionSchema = new mongoose_1.Schema({
    affiliate: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    product: { type: mongoose_1.Schema.Types.ObjectId, ref: "Product", required: true },
    order: { type: mongoose_1.Schema.Types.ObjectId, ref: "Order", required: true },
    commissionAmount: { type: Number, required: true },
    commissionRate: { type: Number, required: true },
    productPrice: { type: Number, required: true },
    status: {
        type: String,
        enum: ["pending", "approved", "rejected", "paid"],
        default: "pending"
    },
    approvedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    paidBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    paidAt: { type: Date },
    rejectedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    rejectedAt: { type: Date },
    rejectionReason: { type: String },
    paymentMethod: { type: String },
    transactionId: { type: String },
}, { timestamps: true });
AffiliateCommissionSchema.index({ affiliate: 1, status: 1 });
AffiliateCommissionSchema.index({ status: 1, createdAt: -1 });
exports.AffiliateCommission = mongoose_1.default.model("AffiliateCommission", AffiliateCommissionSchema);
