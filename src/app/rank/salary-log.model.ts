import { Schema, model, Document, Types } from "mongoose";

export interface IRankSalaryLog extends Document {
  userId: Types.ObjectId;
  rankName: string;
  year: number;
  month: number; // 1–12
}

const RankSalaryLogSchema = new Schema<IRankSalaryLog>({
  userId:   { type: Schema.Types.ObjectId, ref: "User", required: true },
  rankName: { type: String, required: true },
  year:     { type: Number, required: true },
  month:    { type: Number, required: true },
}, { timestamps: true });

RankSalaryLogSchema.index({ userId: 1, rankName: 1, year: 1, month: 1 }, { unique: true });

export const RankSalaryLog = model<IRankSalaryLog>("RankSalaryLog", RankSalaryLogSchema);
