import { Document, model, Schema, Types } from "mongoose";

export interface ICapital extends Document {
  date: Date;
  description: string;
  amount: number;
  paymentInfo?: string;
  paidBy?: string;
  voucherNo?: string;
  document?: string;
  ledgerId: Types.ObjectId;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CapitalSchema = new Schema<ICapital>(
  {
    date: { type: Date, required: true, index: true },
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0.01 },
    paymentInfo: { type: String, default: "", trim: true },
    paidBy: { type: String, default: "", trim: true, index: true },
    voucherNo: { type: String, default: "", trim: true, index: true },
    document: { type: String, default: "" },
    ledgerId: { type: Schema.Types.ObjectId, ref: "CompanyLedger", required: true, unique: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

CapitalSchema.index({ date: -1, createdAt: -1 });

export const Capital = model<ICapital>("Capital", CapitalSchema);
