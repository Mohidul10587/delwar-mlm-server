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
  },
  { timestamps: true }
);

export const Share = model<IShare>("Share", ShareSchema);
