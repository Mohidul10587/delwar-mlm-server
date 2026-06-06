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
exports.AffiliateWithdrawal = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const AffiliateWithdrawalSchema = new mongoose_1.Schema({
    affiliate: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    method: {
        type: String,
        enum: ["bkash", "nagad", "bank"],
        required: true
    },
    accountDetails: {
        accountNumber: { type: String, required: true },
        accountName: { type: String },
        bankName: { type: String },
        branchName: { type: String },
    },
    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending"
    },
    processedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    processedAt: { type: Date },
    transactionId: { type: String },
    rejectionReason: { type: String },
}, { timestamps: true });
AffiliateWithdrawalSchema.index({ affiliate: 1, status: 1 });
AffiliateWithdrawalSchema.index({ status: 1, createdAt: -1 });
exports.AffiliateWithdrawal = mongoose_1.default.model("AffiliateWithdrawal", AffiliateWithdrawalSchema);
