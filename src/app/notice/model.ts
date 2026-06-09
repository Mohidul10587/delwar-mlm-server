import mongoose, { Schema, Document } from "mongoose";

export interface INotice extends Document {
  title: string;
  message: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const noticeSchema = new Schema<INotice>(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export const Notice = mongoose.model<INotice>("Notice", noticeSchema);
