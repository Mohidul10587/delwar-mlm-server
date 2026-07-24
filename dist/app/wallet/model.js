"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionLog = exports.Wallet = void 0;
const mongoose_1 = require("mongoose");
const WalletSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
    },
    totalBalance: { type: Number, default: 0 },
    directCommissionBalance: { type: Number, default: 0 },
    manCommFromDownPayment: { type: Number, default: 0 },
    manCommFromInstallment: { type: Number, default: 0 },
    salaryBalanceFromRanks: { type: Number, default: 0 },
    cashbackBalance: { type: Number, default: 0 },
    transferBalance: { type: Number, default: 0 },
    loanAmount: { type: Number, default: 0 },
    fixedMonthlySalaryForAdminOnly: { type: Number, default: 0 },
    expenseReimbursementBalance: { type: Number, default: 0 },
    rewardBalanceFromInstallment: { type: Number, default: 0 },
}, { timestamps: true });
// Fix F-12: totalBalance is recomputed on every save (for .save() calls)
// For $inc operations callers MUST also $inc totalBalance by the same amount.
WalletSchema.pre("save", function () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    this.totalBalance =
        ((_a = this.directCommissionBalance) !== null && _a !== void 0 ? _a : 0) +
            ((_b = this.manCommFromDownPayment) !== null && _b !== void 0 ? _b : 0) +
            ((_c = this.manCommFromInstallment) !== null && _c !== void 0 ? _c : 0) +
            ((_d = this.salaryBalanceFromRanks) !== null && _d !== void 0 ? _d : 0) +
            ((_e = this.cashbackBalance) !== null && _e !== void 0 ? _e : 0) +
            ((_f = this.transferBalance) !== null && _f !== void 0 ? _f : 0) +
            ((_g = this.fixedMonthlySalaryForAdminOnly) !== null && _g !== void 0 ? _g : 0) +
            ((_h = this.expenseReimbursementBalance) !== null && _h !== void 0 ? _h : 0) +
            ((_j = this.rewardBalanceFromInstallment) !== null && _j !== void 0 ? _j : 0);
    // Note: loanAmount is NOT included in totalBalance (tracked separately)
});
// Index for fast userId lookups
WalletSchema.index({ userId: 1 }, { unique: true });
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
            "cashback",
            "cashback_payment",
            "cashback_payment_refund",
            "transfer_sent",
            "transfer_received",
            "loan_given",
            "loan_adjusted",
            "admin_monthly_salary",
            "expense_reimbursement",
            "installment_reward_one_time",
            "installment_reward_completion",
        ],
        required: true,
    },
    amount: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    note: { type: String, default: "" },
    relatedPurchaseId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Purchase" },
}, { timestamps: true });
// Index for fast transaction history lookups
TransactionLogSchema.index({ userId: 1, createdAt: -1 });
exports.Wallet = (0, mongoose_1.model)("Wallet", WalletSchema);
exports.TransactionLog = (0, mongoose_1.model)("TransactionLog", TransactionLogSchema);
