import { Schema, model, Document, Types } from "mongoose";

export interface ICommissionDebugEntry {
  userId: Types.ObjectId;
  role: "referrer_direct" | "managerial_gen" | "managerial_installment";
  generation?: number;
  field: "balance" | "pendingManagerialCommissionBalance";
  before: number;
  added: number;
  after: number;
  description: string;
}

export interface ICommissionDebug extends Document {
  purchaseId: Types.ObjectId;   // কোন purchase-এর জন্য কমিশন বিতরণ হয়েছে
  buyerId: Types.ObjectId;      // ক্রেতার ID
  buyerName: string;            // ক্রেতার নাম
  buyerUsername: string;        // ক্রেতার ইউজারনেম
  shareTitle: string;           // কোন শেয়ার কেনা হয়েছে
  paymentType: "cash" | "installment"; // নগদ নাকি কিস্তি
  approvedAmount: number;              // যে পরিমাণ অনুমোদিত হয়েছে (কমিশনের ভিত্তি)
  entries: ICommissionDebugEntry[];    // প্রতিটি ওয়ালেট পরিবর্তনের বিস্তারিত তালিকা
  createdAt: Date;
}

const EntrySchema = new Schema<ICommissionDebugEntry>(
  {
    userId:        { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["referrer_direct", "managerial_gen", "managerial_installment"], required: true },
    generation:    { type: Number },
    field:         { type: String, required: true },
    before:        { type: Number, required: true },
    added:         { type: Number, required: true },
    after:         { type: Number, required: true },
    description:   { type: String, required: true },
  },
  { _id: false }
);

const CommissionDebugSchema = new Schema<ICommissionDebug>(
  {
    purchaseId:     { type: Schema.Types.ObjectId, ref: "Purchase", required: true },
    buyerId:        { type: Schema.Types.ObjectId, ref: "User", required: true },
    buyerName:      { type: String, required: true },
    buyerUsername:  { type: String, required: true },
    shareTitle:     { type: String, required: true },
    paymentType:    { type: String, enum: ["cash", "installment"], required: true },
    approvedAmount: { type: Number, required: true },
    entries:        [EntrySchema],
  },
  { timestamps: true }
);

export const CommissionDebug = model<ICommissionDebug>("CommissionDebug", CommissionDebugSchema);
