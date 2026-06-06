import { Schema, model, Document, Types } from "mongoose";

export type PaymentType = "cash" | "installment";
export type PurchaseStatus = "pending" | "approved" | "rejected";

export interface IPurchase extends Document {
  userId: Types.ObjectId;
  shareId: Types.ObjectId;
  quantity: number;
  paymentType: PaymentType;
  amountPaid: number;          // cash: full price × qty | installment: downPayment × qty
  senderAccount: string;       // bank account / bkash / nagad number buyer paid from
  transactionId: string;
  status: PurchaseStatus;
  reviewNote: string;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  commissionProcessed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseSchema = new Schema<IPurchase>(
  {
    userId:        { type: Schema.Types.ObjectId, ref: "User",  required: true },
    shareId:       { type: Schema.Types.ObjectId, ref: "Share", required: true },
    quantity:      { type: Number, required: true, min: 1 },
    paymentType:   { type: String, enum: ["cash", "installment"], required: true },
    amountPaid:    { type: Number, required: true },
    senderAccount: { type: String, required: true },
    transactionId: { type: String, required: true },
    status:        { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    reviewNote:    { type: String, default: "" },
    reviewedBy:    { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt:    { type: Date },
    commissionProcessed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Purchase = model<IPurchase>("Purchase", PurchaseSchema);
