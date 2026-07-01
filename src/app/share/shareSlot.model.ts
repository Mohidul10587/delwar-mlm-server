import { Schema, model, Document, Types } from "mongoose";

export type ShareStatus = "available" | "sold" | "reclaimed";

export interface IShareSlot extends Document {
  shareNumber: string;
  shareId: Types.ObjectId;
  status: ShareStatus;
  userId?: Types.ObjectId;
  purchaseId?: Types.ObjectId;
  reclaimedAt?: Date;
}

const ShareSlotSchema = new Schema<IShareSlot>(
  {
    shareNumber: { type: String, required: true, unique: true },
    shareId:     { type: Schema.Types.ObjectId, ref: "Share", required: true, index: true },
    status:      { type: String, enum: ["available", "sold", "reclaimed"], default: "available", index: true },
    userId:      { type: Schema.Types.ObjectId, ref: "User",     default: null },
    purchaseId:  { type: Schema.Types.ObjectId, ref: "Purchase", default: null },
    reclaimedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// L-06 fix: compound indexes for frequent queries
ShareSlotSchema.index({ shareId: 1, status: 1 });
ShareSlotSchema.index({ purchaseId: 1, status: 1 });
ShareSlotSchema.index({ userId: 1 });

export const ShareSlot = model<IShareSlot>("ShareSlot", ShareSlotSchema);
