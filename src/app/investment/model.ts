import { Schema, model, Document, Types } from "mongoose";

export type ProfitType = "monthly" | "partial" | "maturity";

export interface IInvestment extends Document {
  userId: Types.ObjectId;
  profitType: ProfitType;
  amount: number;
  originalAmount: number;
  profitPaidCount: number;
  senderAccount: string;
  transactionId: string;
  buyerInfo?: Record<string, unknown>;
  startDate: Date;
  endDate: Date;
  lastProfitPaidAt: Date | null;
  lastProfitPaidMonth: string | null;
  status: "active" | "completed";
}

const InvestmentSchema = new Schema<IInvestment>(
  {
    userId:              { type: Schema.Types.ObjectId, ref: "User", required: true },
    profitType:          { type: String, enum: ["monthly", "partial", "maturity"], required: true },
    amount:              { type: Number, required: true },
    originalAmount:      { type: Number, required: true },
    profitPaidCount:     { type: Number, default: 0 },
    senderAccount:       { type: String, required: true },
    transactionId:       { type: String, required: true },
    buyerInfo:           { type: Schema.Types.Mixed, default: null },
    startDate:           { type: Date, default: Date.now },
    endDate:             { type: Date, required: true },
    lastProfitPaidAt:    { type: Date, default: null },
    lastProfitPaidMonth: { type: String, default: null },
    status:              { type: String, enum: ["active", "completed"], default: "active" },
  },
  { timestamps: true }
);

export const Investment = model<IInvestment>("Investment", InvestmentSchema);
