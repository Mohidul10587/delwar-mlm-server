import { Schema, model, Document, Types } from "mongoose";

export interface IWithdrawal extends Document {
  userId: Types.ObjectId;
  amount: number;
  method: "bank" | "mobile" | "cash" | "bkash" | "nagad" | "rocket" | "branch";
  /** For bank withdrawals */
  bankAccount?: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    branchName?: string;
    routingNumber?: string;
  };
  /** For mobile banking withdrawals */
  mobileType?: "bkash" | "nagad" | "rocket";
  mobileNumber?: string;
  mobileAccountName?: string;
  /** Legacy field — kept for backward compat */
  accountDetails: string;
  branch?: string;
  branchId?: Types.ObjectId;
  status: "pending" | "approved" | "rejected";
  reviewNote: string;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  deductionBreakdown?: Record<string, number>;
}

const WithdrawalSchema = new Schema<IWithdrawal>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, min: 1 },
    method: {
      type: String,
      enum: ["bank", "mobile", "cash", "bkash", "nagad", "rocket", "branch"],
      required: true,
    },
    bankAccount: {
      type: {
        bankName: { type: String },
        accountName: { type: String },
        accountNumber: { type: String },
        branchName: { type: String },
        routingNumber: { type: String },
      },
      default: null,
    },
    mobileType: {
      type: String,
      enum: ["bkash", "nagad", "rocket"],
      default: null,
    },
    mobileNumber: { type: String, default: null },
    mobileAccountName: { type: String, default: null },
    accountDetails: { type: String, default: "" },
    branch: { type: String },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", default: null },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    reviewNote: { type: String, default: "" },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    deductionBreakdown: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

export const Withdrawal = model<IWithdrawal>("Withdrawal", WithdrawalSchema);
