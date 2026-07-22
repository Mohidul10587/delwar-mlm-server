import { Schema, model, Document, Types } from "mongoose";

export type InstallmentStatus = "pending" | "approved" | "rejected";
export type PaymentMethod = "cash" | "bank" | "mobile_banking";

export interface IInstallmentPayment extends Document {
  purchaseId: Types.ObjectId;
  userId: Types.ObjectId;
  /**
   * installmentNumbers — এক বা একাধিক কিস্তির নম্বরের array।
   * উদাহরণ: একটি কিস্তি → [3], তিনটি কিস্তি → [3, 4, 5]
   */
  installmentNumbers: number[];
  /**
   * installmentNo — legacy single-installment field (backward compat)।
   * নতুন রেকর্ডে installmentNumbers-এর প্রথম মান হিসেবে সেট হয়।
   */
  installmentNo: number;
  /** কয়টি কিস্তি এই payment-এ আছে */
  installmentCount: number;
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
    // Multi-installment: array of installment numbers covered by this payment
    installmentNumbers: {
      type: [Number],
      required: true,
      validate: {
        validator: (v: number[]) => v.length >= 1,
        message: "At least one installment number is required",
      },
    },
    // Legacy single field — kept for backward compat; equals installmentNumbers[0]
    installmentNo: { type: Number, required: true, min: 1 },
    // How many installments this payment covers (= installmentNumbers.length)
    installmentCount: { type: Number, required: true, default: 1, min: 1 },
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
InstallmentPaymentSchema.index({ purchaseId: 1, installmentNumbers: 1 });
InstallmentPaymentSchema.index({ status: 1 }); // L-07 fix: index for pending queries
InstallmentPaymentSchema.index({ userId: 1 });

export const InstallmentPayment = model<IInstallmentPayment>(
  "InstallmentPayment",
  InstallmentPaymentSchema
);
