import { Schema, model, Document, Types } from "mongoose";

/**
 * RewardCycle — একটি পূর্ণ ১ লক্ষ Cycle-এর রেকর্ড।
 *
 * full_payment  → একটি ট্রানজেকশনেই ১ লক্ষ বা তার বেশি পরিশোধ হয়েছে।
 * split_payment → একাধিক ট্রানজেকশনে ধীরে ধীরে ১ লক্ষ পূর্ণ হয়েছে।
 */
export type RewardCycleType = "full_payment" | "split_payment";
export type RewardStatus = "pending" | "approved" | "paid" | "cancelled";

export interface IRewardCycle {
  cycleNumber: number;          // ১ম, ২য়, ৩য় Cycle
  cycleType: RewardCycleType;
  completedAmount: number;      // এই Cycle-এ মোট পরিশোধিত টাকা (= targetAmount)
  completedAt: Date;            // Cycle শেষ হওয়ার তারিখ
  rewardAmount: number;         // এই Cycle-এর Reward পরিমাণ (Settings থেকে নেওয়া)
  status: RewardStatus;
  /** যে approved installment payment থেকে cycle-টি সম্পন্ন হয়েছে */
  sourcePaymentId?: Types.ObjectId;
  paidAt?: Date;
  note?: string;
}

export interface IRewardTracker extends Document {
  userId: Types.ObjectId;
  purchaseId: Types.ObjectId;   // কোন purchase-এর জন্য

  /** প্রতি Cycle কতটাকায় Reward পাওয়া যাবে (Settings থেকে snapshot) */
  cycleTargetAmount: number;

  /** এখন পর্যন্ত মোট কত টাকা পরিশোধ হয়েছে (DP + approved installments) */
  totalPaidAmount: number;

  /** বর্তমান Cycle-এ এখন পর্যন্ত কত টাকা জমেছে (Carry Forward) */
  carryForwardAmount: number;

  /** মোট কয়টি Cycle সম্পন্ন হয়েছে */
  completedCycles: number;

  /** প্রতিটি Cycle-এর বিবরণ */
  cycles: IRewardCycle[];

  /**
   * যে approved installment payment group-গুলো ইতিমধ্যে tracker-এ process হয়েছে।
   * কোনো group target পূরণ না করলেও তার ID রাখা হয়, যাতে replay হলে carry দ্বিগুণ না হয়।
   */
  processedPaymentIds: Types.ObjectId[];

  /** Reward config snapshot (Settings থেকে) */
  fullPaymentRewardAmount: number;       // একবারে ১ লক্ষ দিলে reward
  splitPaymentRewardAmount: number;      // ধীরে ধীরে ১ লক্ষ পূর্ণ করলে reward

  createdAt: Date;
  updatedAt: Date;
}

const RewardCycleSchema = new Schema<IRewardCycle>(
  {
    cycleNumber:      { type: Number, required: true },
    cycleType:        { type: String, enum: ["full_payment", "split_payment"], required: true },
    completedAmount:  { type: Number, required: true },
    completedAt:      { type: Date, required: true },
    rewardAmount:     { type: Number, required: true, default: 0 },
    status:           { type: String, enum: ["pending", "approved", "paid", "cancelled"], default: "pending" },
    sourcePaymentId:  { type: Schema.Types.ObjectId, ref: "InstallmentPayment" },
    paidAt:           { type: Date },
    note:             { type: String, default: "" },
  },
  { _id: false }
);

const RewardTrackerSchema = new Schema<IRewardTracker>(
  {
    userId:     { type: Schema.Types.ObjectId, ref: "User", required: true },
    purchaseId: { type: Schema.Types.ObjectId, ref: "Purchase", required: true },

    cycleTargetAmount:       { type: Number, required: true },
    totalPaidAmount:         { type: Number, default: 0 },
    carryForwardAmount:      { type: Number, default: 0 },
    completedCycles:         { type: Number, default: 0 },
    cycles:                  { type: [RewardCycleSchema], default: [] },
    processedPaymentIds:     { type: [{ type: Schema.Types.ObjectId, ref: "InstallmentPayment" }], default: [] },

    fullPaymentRewardAmount:  { type: Number, default: 0 },
    splitPaymentRewardAmount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// One tracker per purchase
RewardTrackerSchema.index({ purchaseId: 1 }, { unique: true });
RewardTrackerSchema.index({ userId: 1 });

export const RewardTracker = model<IRewardTracker>(
  "RewardTracker",
  RewardTrackerSchema
);
