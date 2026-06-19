import { Schema, model, Document, Types } from "mongoose";

export interface IWallet extends Document {
  userId: Types.ObjectId;
  balance: number;
  directCommissionBalance: number;
  manCommFromDownPayment: number;
  manCommFromInstallment: number;
  salaryBalance: number;
  rewardBalance: number;
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
    | "admin_debit";
  amount: number;
  balanceAfter: number;
  note: string;
  relatedPurchaseId?: Types.ObjectId;
}

const WalletSchema = new Schema<IWallet>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    balance: { type: Number, default: 0 },
    directCommissionBalance: { type: Number, default: 0 },
    manCommFromDownPayment: { type: Number, default: 0 },
    manCommFromInstallment: { type: Number, default: 0 },
    salaryBalance: { type: Number, default: 0 },
    rewardBalance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

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

export const Wallet = model<IWallet>("Wallet", WalletSchema);
export const TransactionLog = model<ITransactionLog>("TransactionLog", TransactionLogSchema);
