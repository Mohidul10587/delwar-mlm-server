import { Schema, model, Document } from "mongoose";

interface IInstallment {
  downPayment: number;
  perInstallment: number;
  totalInstallments: number;
}

export interface IShare extends Document {
  title: string;
  image: string;
  images: string[];
  cashPrice: number;
  installment: IInstallment;
  directSalesCommissionForCashSell: number;
  directSalesCommissionForInstallmentSell: number;
  managerialCommissionForCashSell: number;
  managerialCommissionForInstallmentSell: number;
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
    installment: {
      downPayment:       { type: Number, required: true },
      perInstallment:    { type: Number, required: true },
      totalInstallments: { type: Number, required: true },
    },
    directSalesCommissionForCashSell:          { type: Number, default: 0 },
    directSalesCommissionForInstallmentSell:   { type: Number, default: 0 },
    managerialCommissionForCashSell:           { type: Number, default: 0 },
    managerialCommissionForInstallmentSell:    { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    projectType:    { type: String, default: "" },
    location:       { type: String, default: "" },
    developer:      { type: String, default: "" },
    videoLink:      { type: String, default: "" },
    categoryId:     { type: String, default: "" },
    projectStatus:  { type: String, enum: ["complete", "running", "upcoming"], default: "upcoming" },
  },
  { timestamps: true }
);

export const Share = model<IShare>("Share", ShareSchema);
