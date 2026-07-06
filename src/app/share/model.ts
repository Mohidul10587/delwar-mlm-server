import { Schema, model, Document } from "mongoose";

export interface IGenerationCommissionRate {
  generation: number;
  rate: number; // % of down payment portion
}

export interface IShare extends Document {
  title: string;
  description?: string;
  image: string;
  images: string[];
  cashPrice: number;
  regularPrice?: number;

  // Down payment config
  minDownPayment: number;
  maxDownPayment: number;

  // Installment config
  minInstallments: number;
  maxInstallments: number;

  // Direct sale commission
  directSaleCommissionValue: number;

  // Down payment managerial commission (per generation)
  downPaymentGenerationRates: IGenerationCommissionRate[];

  // Installment managerial commission (per generation)
  installmentGenerationRates: IGenerationCommissionRate[];
  /** @deprecated use installmentGenerationRates — kept for backward compat */
  installmentCommissionRate: number;

  totalShares: number;
  isActive: boolean;
  projectType?: string;
  location?: string;
  developer?: string;
  videoLink?: string;
  categoryId?: string;
  projectStatus: "complete" | "running" | "upcoming";

  // Offer fields
  isOffer: boolean;
  offerText: string | null;
  offerStartDate: Date | null;
  offerEndDate: Date | null;
  offerPriority: number;

  // Cover slider flag — only one share can have this true at a time
  isCoverSlider: boolean;
}

const ShareSchema = new Schema<IShare>(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    image: { type: String, required: true },
    images: [{ type: String }],
    cashPrice: { type: Number, required: true },
    regularPrice: { type: Number },

    minDownPayment: { type: Number, default: 15000 },
    maxDownPayment: { type: Number, default: 50000 },

    minInstallments: { type: Number, default: 5 },
    maxInstallments: { type: Number, default: 60 },

    directSaleCommissionValue: { type: Number, default: 0 },

    downPaymentGenerationRates: [
      {
        generation: { type: Number },
        rate: { type: Number },
        _id: false,
      },
    ],

    installmentCommissionRate: { type: Number, default: 0 },

    installmentGenerationRates: [
      {
        generation: { type: Number },
        rate: { type: Number },
        _id: false,
      },
    ],

    isActive: { type: Boolean, default: true },
    totalShares: { type: Number, required: true, default: 0 },
    projectType: { type: String, default: "" },
    location: { type: String, default: "" },
    developer: { type: String, default: "" },
    videoLink: { type: String, default: "" },
    categoryId: { type: String, default: "" },
    projectStatus: {
      type: String,
      enum: ["complete", "running", "upcoming"],
      default: "running",
    },

    // Offer fields
    isOffer: { type: Boolean, default: false },
    offerText: { type: String, default: null },
    offerStartDate: { type: Date, default: null },
    offerEndDate: { type: Date, default: null },
    offerPriority: { type: Number, default: 0 },

    // Cover slider — admin selects which share's images appear as cover
    isCoverSlider: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Share = model<IShare>("Share", ShareSchema);
