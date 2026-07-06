import { Schema, model, Document, Types } from "mongoose";

export type CertificateStatus = "pending" | "issued";

export interface ICertificate extends Document {
  userId: Types.ObjectId;
  purchaseId: Types.ObjectId;
  shareId: Types.ObjectId;
  status: CertificateStatus;
  issuedAt?: Date;
}

const CertificateSchema = new Schema<ICertificate>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    purchaseId: { type: Schema.Types.ObjectId, ref: "Purchase", required: true, unique: true },
    shareId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    status: { type: String, enum: ["pending", "issued"], default: "pending" },
    issuedAt: { type: Date },
  },
  { timestamps: true }
);

export const Certificate = model<ICertificate>("Certificate", CertificateSchema);
