"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionLog = exports.Wallet = void 0;
const mongoose_1 = require("mongoose");
const WalletSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    totalBalance: { type: Number, default: 0 },
    directCommissionBalance: { type: Number, default: 0 },
    manCommFromDownPayment: { type: Number, default: 0 },
    manCommFromInstallment: { type: Number, default: 0 },
    salaryBalance: { type: Number, default: 0 },
    rewardBalance: { type: Number, default: 0 },
    incentiveBonus: { type: Number, default: 0 },
    transferBalance: { type: Number, default: 0 },
}, { timestamps: true });
WalletSchema.pre("save", function () {
    var _a, _b, _c, _d, _e, _f, _g;
    this.totalBalance =
        ((_a = this.directCommissionBalance) !== null && _a !== void 0 ? _a : 0) +
            ((_b = this.manCommFromDownPayment) !== null && _b !== void 0 ? _b : 0) +
            ((_c = this.manCommFromInstallment) !== null && _c !== void 0 ? _c : 0) +
            ((_d = this.salaryBalance) !== null && _d !== void 0 ? _d : 0) +
            ((_e = this.rewardBalance) !== null && _e !== void 0 ? _e : 0) +
            ((_f = this.incentiveBonus) !== null && _f !== void 0 ? _f : 0) +
            ((_g = this.transferBalance) !== null && _g !== void 0 ? _g : 0);
});
const TransactionLogSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
        type: String,
        enum: [
            "direct_commission",
            "installment_commission",
            "managerial_commission",
            "managerial_installment_commission",
            "salary",
            "reward",
            "withdrawal",
            "withdrawal_rejected",
            "admin_credit",
            "admin_debit",
            "installment_received",
            "incentive_bonus",
            "transfer_sent",
            "transfer_received",
        ],
        required: true,
    },
    amount: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    note: { type: String, default: "" },
    relatedPurchaseId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Purchase" },
}, { timestamps: true });
exports.Wallet = (0, mongoose_1.model)("Wallet", WalletSchema);
exports.TransactionLog = (0, mongoose_1.model)("TransactionLog", TransactionLogSchema);
