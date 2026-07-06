import { Schema, model, Document, Types } from "mongoose";

export type InstallmentStatus = "pending" | "approved" | "rejected";
export type PaymentMethod = "cash" | "bank" | "mobile_banking";

export interface IInstallmentPayment extends Document {
  purchaseId: Types.ObjectId;
  userId: Types.ObjectId;
  installmentNo: number;
  amount: number;
  senderAccount: string;
  transactionId: string;
  paymentMethod: PaymentMethod;
  receiptImage?: string;
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
    paymentMethod: {
      type: String,
      enum: ["cash", "bank", "mobile_banking"],
      default: "cash",
    },
    receiptImage: { type: String, default: null },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    reviewNote: { type: String, default: "" },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

// F-09: Unique index on transactionId — prevents duplicate installment submissions
InstallmentPaymentSchema.index({ transactionId: 1 }, { unique: true, sparse: true });
InstallmentPaymentSchema.index({ purchaseId: 1, installmentNo: 1 });
InstallmentPaymentSchema.index({ status: 1 }); // L-07 fix: index for pending queries
InstallmentPaymentSchema.index({ userId: 1 });

export const InstallmentPayment = model<IInstallmentPayment>(
  "InstallmentPayment",
  InstallmentPaymentSchema
);
