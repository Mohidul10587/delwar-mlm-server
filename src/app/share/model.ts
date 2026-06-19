import { Schema, model, Document } from "mongoose";

export interface IGenerationCommissionRate {
  generation: number;
  rate: number; // % of down payment portion
}

export interface IShare extends Document {
  title: string;
  image: string;
  images: string[];
  cashPrice: number;

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

  // Installment managerial commission (same rate for all generations)
  installmentCommissionRate: number; // %

  isActive: boolean;
  projectType?: string;
  location?: string;
  developer?: string;
  videoLink?: string;
  categoryId?: string;
  projectStatus?: "complete" | "running" | "upcoming";
}

const ShareSchema = new Schema<IShare>(
  {
    title: { type: String, required: true },
    image: { type: String, required: true },
    images: [{ type: String }],
    cashPrice: { type: Number, required: true },

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

    isActive: { type: Boolean, default: true },
    projectType: { type: String, default: "" },
    location: { type: String, default: "" },
    developer: { type: String, default: "" },
    videoLink: { type: String, default: "" },
    categoryId: { type: String, default: "" },
    projectStatus: { type: String, enum: ["complete", "running", "upcoming"], default: "upcoming" },
  },
  { timestamps: true }
);

export const Share = model<IShare>("Share", ShareSchema);
