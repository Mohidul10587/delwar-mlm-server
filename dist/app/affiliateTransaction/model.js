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
exports.AffiliateTransaction = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const AffiliateTransactionSchema = new mongoose_1.Schema({
    affiliate: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    product: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
    },
    order: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Order",
        required: true,
    },
    commissionAmount: {
        type: Number,
        required: true,
    },
    commissionType: {
        type: String,
        enum: ["percentage", "fixed"],
        required: true,
    },
    commissionRate: {
        type: Number,
        required: true,
    },
    productPrice: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ["pending", "confirmed", "cancelled"],
        default: "pending",
    },
    type: {
        type: String,
        enum: ["AFFILIATE_COMMISSION", "AFFILIATE_WITHDRAW_APPROVED", "AFFILIATE_WITHDRAW_REJECTED"],
        required: true,
    },
    flow: {
        type: String,
        enum: ["CREDIT", "DEBIT"],
        required: true,
    },
    previousBalance: {
        type: Number,
        required: true,
    },
    currentBalance: {
        type: Number,
        required: true,
    },
    note: { type: String },
}, { timestamps: true });
exports.AffiliateTransaction = mongoose_1.default.model("AffiliateTransaction", AffiliateTransactionSchema);
