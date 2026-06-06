"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionLog = exports.Wallet = void 0;
const mongoose_1 = require("mongoose");
const WalletSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    balance: { type: Number, default: 0 },
    pendingManagerialCommissionBalance: { type: Number, default: 0 },
    pendingTeamManagementCommissionOfSideA: { type: Number, default: 0 },
    pendingTeamManagementCommissionOfSideB: { type: Number, default: 0 },
}, { timestamps: true });
const TransactionLogSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
        type: String,
        enum: ["direct_commission", "installment_commission", "managerial_commission", "team_commission", "withdrawal", "withdrawal_rejected", "admin_credit", "admin_debit"],
        required: true,
    },
    amount: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    note: { type: String, default: "" },
    relatedPurchaseId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Purchase" },
}, { timestamps: true });
exports.Wallet = (0, mongoose_1.model)("Wallet", WalletSchema);
exports.TransactionLog = (0, mongoose_1.model)("TransactionLog", TransactionLogSchema);
