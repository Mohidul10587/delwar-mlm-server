import { Schema, model, Document, Types } from "mongoose";

export type PaymentType = "cash" | "installment";
export type PurchaseStatus = "pending" | "approved" | "rejected";
export type PaymentMethod = "cash" | "bank" | "mobile_banking";

export interface IBuyerNominee {
  name: string;
  relation: string;
  phone: string;
  nid?: string;
  image?: string;
}

export interface IBuyerInfo {
  name: string;
  phone: string;
  nid?: string;
  /** Legacy fixed fields – kept for backward compatibility */
  nominee?: IBuyerNominee;
  nominee2?: IBuyerNominee;
  /** New: dynamic nominees array */
  nominees?: IBuyerNominee[];
}

export interface IPurchaseSnapshot {
  shareTitle: string;
  shareImage: string;
  cashPrice: number;
  minDownPayment: number;
  maxDownPayment: number;
  directSaleCommissionValue: number;
  downPaymentGenerationRates: { generation: number; rate: number }[];
  /** @deprecated use installmentGenerationRates — kept for backward compat with old records */
  installmentCommissionRate: number;
  installmentGenerationRates: { generation: number; rate: number }[];
  rankQualification: {
    rankName: string;
    order: number;
    /** Renamed from: requiredApprovedSales */
    minNetworkSalesAmount: number;
  }[];
  salaryRules: {
    rankName: string;
    amount: number;
    /** Renamed from: durationMonths */
    salaryDurationMonths: number;
    /** Renamed from: minMonthlySales */
    minMonthlySalesQty: number;
    /** Renamed from: requiredPersonalShares → minPersonalPurchaseQty → minMonthlyPersonalPurchaseQtyForSalary */
    minMonthlyPersonalPurchaseQtyForSalary: number;
  }[];
}

export interface IPurchase extends Document {
  userId: Types.ObjectId;
  shareId: Types.ObjectId;
  quantity: number;
  paymentType: PaymentType;
  paymentMethod: PaymentMethod;
  receiptImage?: string;
  downPayment: number;
  installmentCount: number;
  installmentAmount: number;
  amountPaid: number;
  senderAccount: string;
  transactionId: string;
  status: PurchaseStatus;
  reviewNote: string;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  commissionProcessed: boolean;
  buyerInfo?: IBuyerInfo;
  snapshot: IPurchaseSnapshot;
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
    // Legacy fixed fields – kept for backward compatibility with existing records
    nominee: { type: NomineeSchema },
    nominee2: { type: NomineeSchema },
    // New dynamic nominees array
    nominees: { type: [NomineeSchema], default: undefined },
  },
  { _id: false }
);

const SnapshotSchema = new Schema(
  {
    shareTitle: { type: String },
    shareImage: { type: String },
    cashPrice: { type: Number },
    minDownPayment: { type: Number },
    maxDownPayment: { type: Number },
    directSaleCommissionValue: { type: Number },
    downPaymentGenerationRates: [
      { generation: { type: Number }, rate: { type: Number }, _id: false },
    ],
    // Legacy flat rate — kept so old purchase records remain readable
    installmentCommissionRate: { type: Number },
    // New per-generation rates (mirrors downPaymentGenerationRates)
    installmentGenerationRates: [
      { generation: { type: Number }, rate: { type: Number }, _id: false },
    ],
    rankQualification: [
      {
        rankName: { type: String },
        order: { type: Number },
        // Renamed from: requiredApprovedSales
        minNetworkSalesAmount: { type: Number },
        _id: false,
      },
    ],
    salaryRules: [
      {
        rankName: { type: String },
        amount: { type: Number },
        // Renamed from: durationMonths
        salaryDurationMonths: { type: Number },
        // Renamed from: minMonthlySales
        minMonthlySalesQty: { type: Number },
        // Renamed from: requiredPersonalShares → minPersonalPurchaseQty → minMonthlyPersonalPurchaseQtyForSalary
        minMonthlyPersonalPurchaseQtyForSalary: { type: Number },
        _id: false,
      },
    ],
  },
  { _id: false }
);

const PurchaseSchema = new Schema<IPurchase>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    shareId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    quantity: { type: Number, required: true, min: 1 },
    paymentType: {
      type: String,
      enum: ["cash", "installment"],
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "bank", "mobile_banking"],
      default: "cash",
    },
    receiptImage: { type: String, default: null },
    downPayment: { type: Number, required: true },
    installmentCount: { type: Number, required: true },
    installmentAmount: { type: Number, required: true },
    amountPaid: { type: Number, required: true },
    senderAccount: { type: String, required: true },
    transactionId: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    reviewNote: { type: String, default: "" },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    commissionProcessed: { type: Boolean, default: false },
    buyerInfo: { type: BuyerInfoSchema, default: null },
    snapshot: { type: SnapshotSchema },
  },
  { timestamps: true }
);

// Fix D-02: Add indexes for performance and duplicate prevention
PurchaseSchema.index({ userId: 1, createdAt: -1 });
PurchaseSchema.index({ status: 1 });
PurchaseSchema.index({ transactionId: 1 }, { unique: true, sparse: true });

export const Purchase = model<IPurchase>("Purchase", PurchaseSchema);
