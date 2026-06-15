import { Schema, model, Document, Types } from "mongoose";

export type PaymentType = "cash" | "installment";
export type PurchaseStatus = "pending" | "approved" | "rejected";

export interface IBuyerInfo {
  name: string;
  phone: string;
  nid?: string;
  nominee?: {
    name: string;
    relation: string;
    phone: string;
    nid?: string;
    image?: string;
  };
  nominee2?: {
    name: string;
    relation: string;
    phone: string;
    nid?: string;
    image?: string;
  };
}

export interface IPurchaseSnapshot {
  shareTitle: string;
  cashPrice: number;
  minDownPayment: number;
  maxDownPayment: number;
  cashDownPaymentLimit: number;
  installmentOptions: number[];
  minInstallments: number;
  maxInstallments: number;
  directSaleCommissionValue: number;
  downPaymentGenerationRates: { generation: number; rate: number }[];
  installmentCommissionRate: number;
}

export interface IPurchase extends Document {
  userId: Types.ObjectId;
  shareId: Types.ObjectId;
  quantity: number;
  paymentType: PaymentType;
  amountPaid: number;
  selectedInstallments?: number;
  senderAccount: string;
  transactionId: string;
  status: PurchaseStatus;
  reviewNote: string;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  commissionProcessed: boolean;
  buyerInfo?: IBuyerInfo;
  snapshot?: IPurchaseSnapshot;
  createdAt: Date;
  updatedAt: Date;
}

const NomineeSchema = new Schema(
  {
    name: { type: String },
    relation: { type: String },
    phone: { type: String },
    nid: { type: String },
    image: { type: String },
  },
  { _id: false }
);

const BuyerInfoSchema = new Schema(
  {
    name: { type: String },
    phone: { type: String },
    nid: { type: String },
    nominee: { type: NomineeSchema },
    nominee2: { type: NomineeSchema },
  },
  { _id: false }
);

const SnapshotSchema = new Schema(
  {
    shareTitle: { type: String },
    cashPrice: { type: Number },
    minDownPayment: { type: Number },
    maxDownPayment: { type: Number },
    cashDownPaymentLimit: { type: Number },
    installmentOptions: [{ type: Number }],
    minInstallments: { type: Number },
    maxInstallments: { type: Number },
    directSaleCommissionValue: { type: Number },
    downPaymentGenerationRates: [{ generation: { type: Number }, rate: { type: Number }, _id: false }],
    installmentCommissionRate: { type: Number },
  },
  { _id: false }
);

const PurchaseSchema = new Schema<IPurchase>(
  {
    userId:        { type: Schema.Types.ObjectId, ref: "User",  required: true },
    shareId:       { type: Schema.Types.ObjectId, ref: "Share", required: true },
    quantity:      { type: Number, required: true, min: 1 },
    paymentType:   { type: String, enum: ["cash", "installment"], required: true },
    amountPaid:    { type: Number, required: true },
    selectedInstallments: { type: Number },
    senderAccount: { type: String, required: true },
    transactionId: { type: String, required: true },
    status:        { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    reviewNote:    { type: String, default: "" },
    reviewedBy:    { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt:    { type: Date },
    commissionProcessed: { type: Boolean, default: false },
    buyerInfo:     { type: BuyerInfoSchema, default: null },
    snapshot:      { type: SnapshotSchema, default: null },
  },
  { timestamps: true }
);

export const Purchase = model<IPurchase>("Purchase", PurchaseSchema);
