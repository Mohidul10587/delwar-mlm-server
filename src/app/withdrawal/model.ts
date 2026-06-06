import { Schema, model, Document, Types } from "mongoose";

export interface IWithdrawal extends Document {
  userId: Types.ObjectId;
  amount: number;
  method: "bank" | "bkash" | "nagad";
  accountDetails: string;
  status: "pending" | "approved" | "rejected";
  reviewNote: string;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
}

const WithdrawalSchema = new Schema<IWithdrawal>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, min: 1 },
    method: { type: String, enum: ["bank", "bkash", "nagad"], required: true },
    accountDetails: { type: String, required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    reviewNote: { type: String, default: "" },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

export const Withdrawal = model<IWithdrawal>("Withdrawal", WithdrawalSchema);
