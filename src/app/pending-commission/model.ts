import { Schema, model, Document, Types } from "mongoose";

/**
 * PendingCommission — stores team management commissions that are NOT instantly
 * credited. They accumulate in daily batches and are released by Super Admin.
 *
 * commission types stored here:
 *   - "down_payment_managerial"   : Down Payment থেকে Managerial Commission
 *   - "installment_managerial"    : Installment থেকে Managerial Commission
 */
export type PendingCommissionType =
  | "down_payment_managerial"
  | "installment_managerial";

export type PendingCommissionStatus = "pending" | "released";

export interface IPendingCommission extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;           // যে ইউজার কমিশন পাবে
  purchaseId: Types.ObjectId;       // সম্পর্কিত Purchase
  type: PendingCommissionType;
  amount: number;
  generation: number;               // কততম generation (1, 2, 3 ...)
  note: string;
  status: PendingCommissionStatus;
  batchDate: string;                // "YYYY-MM-DD" — যে দিন generate হয়েছে
  batchId: string;                  // "YYYY-MM-DD" — batch identifier (same as batchDate)
  releasedAt?: Date;
  releasedBy?: Types.ObjectId;      // Super Admin userId যিনি release করেছেন
}

const PendingCommissionSchema = new Schema<IPendingCommission>(
  {
    userId:    { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    purchaseId:{ type: Schema.Types.ObjectId, ref: "Purchase", required: true },
    type:      { type: String, enum: ["down_payment_managerial", "installment_managerial"], required: true },
    amount:    { type: Number, required: true },
    generation:{ type: Number, required: true },
    note:      { type: String, default: "" },
    status:    { type: String, enum: ["pending", "released"], default: "pending", index: true },
    batchDate: { type: String, required: true, index: true },  // "YYYY-MM-DD"
    batchId:   { type: String, required: true, index: true },  // same as batchDate for now
    releasedAt:{ type: Date },
    releasedBy:{ type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Compound indexes for batch queries
PendingCommissionSchema.index({ batchId: 1, status: 1 });
PendingCommissionSchema.index({ userId: 1, status: 1 });
PendingCommissionSchema.index({ batchDate: 1, status: 1 });

export const PendingCommission = model<IPendingCommission>(
  "PendingCommission",
  PendingCommissionSchema
);
