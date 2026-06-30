import { Schema, model, Document, Types } from "mongoose";

/**
 * CompanyLedger — tracks every rupee that enters or leaves the company.
 *
 * INFLOW  (company receives money):
 *   purchase_received        — cash purchase down-payment approved
 *   installment_received     — individual installment payment approved
 *   investment_received      — investment deposit created
 *   transfer_fee_received    — fee charged on balance transfer between users
 *
 * OUTFLOW (company pays out):
 *   commission_paid          — direct or managerial commission to a user's wallet
 *   salary_paid              — monthly rank salary credited to a user's wallet
 *   reward_paid              — rank achievement reward credited to a user's wallet
 *   investment_profit_paid   — monthly / partial / maturity profit distributed
 *   withdrawal_paid          — withdrawal request approved (money leaves company)
 *   incentive_bonus_paid     — incentive bonus granted by admin
 */
export type LedgerType =
  | "purchase_received"
  | "installment_received"
  | "investment_received"
  | "transfer_fee_received"
  | "commission_paid"
  | "salary_paid"
  | "reward_paid"
  | "investment_profit_paid"
  | "withdrawal_paid"
  | "incentive_bonus_paid";

export const INFLOW_TYPES: LedgerType[] = [
  "purchase_received",
  "installment_received",
  "investment_received",
  "transfer_fee_received",
];

export const OUTFLOW_TYPES: LedgerType[] = [
  "commission_paid",
  "salary_paid",
  "reward_paid",
  "investment_profit_paid",
  "withdrawal_paid",
  "incentive_bonus_paid",
];

export interface ICompanyLedger extends Document {
  date: Date;
  type: LedgerType;
  amount: number;
  relatedId?: Types.ObjectId;
  relatedModel?: "Purchase" | "InstallmentPayment" | "Investment" | "Withdrawal" | "TransactionLog";
  userId?: Types.ObjectId; // the user involved
  note?: string;
}

const CompanyLedgerSchema = new Schema<ICompanyLedger>(
  {
    date:         { type: Date, required: true, index: true },
    type:         { type: String, enum: [...INFLOW_TYPES, ...OUTFLOW_TYPES], required: true, index: true },
    amount:       { type: Number, required: true },
    relatedId:    { type: Schema.Types.ObjectId },
    relatedModel: { type: String },
    userId:       { type: Schema.Types.ObjectId, ref: "User" },
    note:         { type: String, default: "" },
  },
  { timestamps: true }
);

CompanyLedgerSchema.index({ date: 1, type: 1 });
// Dedup guard only for inflow types (one ledger row per source document)
CompanyLedgerSchema.index(
  { relatedId: 1, type: 1 },
  { unique: true, sparse: true, partialFilterExpression: { type: { $in: ["purchase_received", "installment_received", "investment_received", "withdrawal_paid"] } } }
);

export const CompanyLedger = model<ICompanyLedger>("CompanyLedger", CompanyLedgerSchema);
