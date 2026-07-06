import { Schema, model, Document, Types } from "mongoose";

// Admin submits → Super Admin approves/rejects → Wallet updated on approval.

export type AdminExpenseStatus = "pending" | "approved" | "rejected";

export interface IAdminExpense extends Document {
  submittedBy: Types.ObjectId;   // admin/superadmin user id
  amount: number;
  description: string;
  expenseDate: Date;
  receiptImage?: string;          // Cloudinary URL (optional)
  status: AdminExpenseStatus;
  reviewNote?: string;
  reviewedBy?: Types.ObjectId;   // reviewer user id
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AdminExpenseSchema = new Schema<IAdminExpense>(
  {
    submittedBy:  { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount:       { type: Number, required: true, min: 1 },
    description:  { type: String, required: true, trim: true },
    expenseDate:  { type: Date, required: true },
    receiptImage: { type: String, default: null },
    status:       { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
    reviewNote:   { type: String, default: "" },
    reviewedBy:   { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt:   { type: Date, default: null },
  },
  { timestamps: true }
);

AdminExpenseSchema.index({ submittedBy: 1, createdAt: -1 });
AdminExpenseSchema.index({ status: 1, createdAt: -1 });

export const AdminExpense = model<IAdminExpense>("AdminExpense", AdminExpenseSchema);
