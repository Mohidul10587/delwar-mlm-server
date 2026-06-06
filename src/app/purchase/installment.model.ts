import { Schema, model, Document, Types } from "mongoose";

export type InstallmentStatus = "pending" | "approved" | "rejected";

export interface IInstallmentPayment extends Document {
  purchaseId: Types.ObjectId;
  userId: Types.ObjectId;
  installmentNo: number;
  amount: number;
  senderAccount: string;
  transactionId: string;
  status: InstallmentStatus;
  reviewNote: string;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
}

const InstallmentPaymentSchema = new Schema<IInstallmentPayment>(
  {
    purchaseId: { type: Schema.Types.ObjectId, ref: "Purchase", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    installmentNo: { type: Number, required: true, min: 1 },
    amount: { type: Number, required: true, min: 1 },
    senderAccount: { type: String, required: true },
    transactionId: { type: String, required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    reviewNote: { type: String, default: "" },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

export const InstallmentPayment = model<IInstallmentPayment>(
  "InstallmentPayment",
  InstallmentPaymentSchema
);
