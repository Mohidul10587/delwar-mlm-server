import { Schema, model, Document, Types } from "mongoose";

export interface IWallet extends Document {
  userId: Types.ObjectId;
  totalBalance: number; // pre-save computed
  directCommissionBalance: number;
  manCommFromDownPayment: number;
  manCommFromInstallment: number;
  salaryBalanceFromRanks: number;
  cashbackBalance: number; // admin-granted, non-withdrawable
  transferBalance: number; // received via balance transfer
  loanAmount: number; // admin-granted loan, tracked separately
  fixedMonthlySalaryForAdminOnly: number; // salary released by super admin
  expenseReimbursementBalance: number; // approved expense reimbursements
  rewardBalanceFromInstallment: number; // earned from installment reward system
}

export interface ITransactionLog extends Document {
  userId: Types.ObjectId;
  type:
    | "direct_commission"
    | "installment_commission"
    | "managerial_commission"
    | "managerial_installment_commission"
    | "salary"
    | "reward"
    | "withdrawal"
    | "withdrawal_rejected"
    | "admin_credit"
    | "admin_debit"
    | "installment_received"
    | "incentive_bonus"
    | "cashback"
    | "cashback_payment"
    | "cashback_payment_refund"
    | "transfer_sent"
    | "transfer_received"
    | "loan_given"
    | "loan_adjusted"
    | "admin_monthly_salary"
    | "expense_reimbursement"
    | "installment_reward_one_time" // one-time payment reward
    | "installment_reward_completion"; // installment completion reward
  amount: number;
  balanceAfter: number;
  note: string;
  relatedPurchaseId?: Types.ObjectId;
}

const WalletSchema = new Schema<IWallet>(
  {
    userId: {
      type: Schema.Types.ObjectId,
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
  },
  { timestamps: true }
);

// Fix F-12: totalBalance is recomputed on every save (for .save() calls)
// For $inc operations callers MUST also $inc totalBalance by the same amount.
WalletSchema.pre("save", function () {
  this.totalBalance =
    (this.directCommissionBalance ?? 0) +
    (this.manCommFromDownPayment ?? 0) +
    (this.manCommFromInstallment ?? 0) +
    (this.salaryBalanceFromRanks ?? 0) +
    (this.cashbackBalance ?? 0) +
    (this.transferBalance ?? 0) +
    (this.fixedMonthlySalaryForAdminOnly ?? 0) +
    (this.expenseReimbursementBalance ?? 0) +
    (this.rewardBalanceFromInstallment ?? 0);
  // Note: loanAmount is NOT included in totalBalance (tracked separately)
});

// Index for fast userId lookups
WalletSchema.index({ userId: 1 }, { unique: true });

const TransactionLogSchema = new Schema<ITransactionLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
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
    relatedPurchaseId: { type: Schema.Types.ObjectId, ref: "Purchase" },
  },
  { timestamps: true }
);

// Index for fast transaction history lookups
TransactionLogSchema.index({ userId: 1, createdAt: -1 });

export const Wallet = model<IWallet>("Wallet", WalletSchema);
export const TransactionLog = model<ITransactionLog>(
  "TransactionLog",
  TransactionLogSchema
);
