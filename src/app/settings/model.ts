import { Schema, model, Document } from "mongoose";

export interface ISettings extends Document {
  siteTitle: string;
  siteTagline: string;
  aboutMission: string;
  aboutVision: string;
  aboutValues: string;
  logo: string;
  favicon: string;
  metaDescription: string;
  metaKeywords: string;
  contactPhone: string;
  contactEmail: string;
  contactAddress: string;
  socialFacebook: string;
  socialYoutube: string;
  bkash: string;
  nagad: string;
  bankName: string;
  bankAccount: string;
  bankBranch: string;
  // Default share config (pre-filled when uploading a new share)
  defaultShareConfig: {
    minDownPayment: number;
    maxDownPayment: number;
    cashDownPaymentLimit: number;
    installmentOptions: number[];
    minInstallments: number;
    maxInstallments: number;
    directSaleCommissionValue: number;
    downPaymentGenerationRates: { generation: number; rate: number }[];
    installmentCommissionRate: number;
  };
  managerialCommissionWeeklyProcessDay: number;
  // Rank definitions
  ranks: {
    name: string;
    order: number;
    requiredGeneration: number;
    requiredApprovedSales: number;
    reward?: {
      name: string;
      type: "cash" | "product" | "gift" | "vehicle" | "tour" | "electronics" | "other";
      value: number;
      description: string;
    };
    salary?: {
      amount: number;
      durationMonths: number;
      minMonthlySales: number;
      requiredPersonalShares: number;
      requiredPersonalPurchaseAmount: number;
    };
  }[];
  // Branches
  branches: string[];
  // Investment config
  investmentConfig: {
    monthly:  { profitPercentage: number; minAmount: number; bulletPoints: { en: string; bn: string }[] };
    partial:  { profitPercentage: number; minAmount: number; bulletPoints: { en: string; bn: string }[] };
    maturity: { profitPercentage: number; minAmount: number; bulletPoints: { en: string; bn: string }[] };
  };
}

const SettingsSchema = new Schema<ISettings>({
  siteTitle:       { type: String, default: "" },
  siteTagline:     { type: String, default: "" },
  aboutMission:    { type: String, default: "" },
  aboutVision:     { type: String, default: "" },
  aboutValues:     { type: String, default: "" },
  logo:            { type: String, default: "" },
  favicon:         { type: String, default: "" },
  metaDescription: { type: String, default: "" },
  metaKeywords:    { type: String, default: "" },
  contactPhone:    { type: String, default: "" },
  contactEmail:    { type: String, default: "" },
  contactAddress:  { type: String, default: "" },
  socialFacebook:  { type: String, default: "" },
  socialYoutube:   { type: String, default: "" },
  bkash:           { type: String, default: "" },
  nagad:           { type: String, default: "" },
  bankName:        { type: String, default: "" },
  bankAccount:     { type: String, default: "" },
  bankBranch:      { type: String, default: "" },
  defaultShareConfig: {
    type: {
      minDownPayment:       { type: Number, default: 15000 },
      maxDownPayment:       { type: Number, default: 50000 },
      cashDownPaymentLimit: { type: Number, default: 50000 },
      installmentOptions:   [{ type: Number }],
      minInstallments:      { type: Number, default: 5 },
      maxInstallments:      { type: Number, default: 60 },
      directSaleCommissionValue: { type: Number, default: 0 },
      downPaymentGenerationRates: [{ generation: { type: Number }, rate: { type: Number }, _id: false }],
      installmentCommissionRate: { type: Number, default: 0 },
    },
    default: () => ({
      minDownPayment: 15000,
      maxDownPayment: 50000,
      cashDownPaymentLimit: 50000,
      installmentOptions: [5, 12, 24, 36, 60],
      minInstallments: 5,
      maxInstallments: 60,
      directSaleCommissionValue: 0,
      downPaymentGenerationRates: [],
      installmentCommissionRate: 0,
    }),
  },
  managerialCommissionWeeklyProcessDay: { type: Number, default: 0 },
  ranks: [{
    name: { type: String },
    order: { type: Number, default: 0 },
    requiredGeneration: { type: Number, default: 1 },
    requiredApprovedSales: { type: Number, default: 0 },
    reward: {
      name: { type: String, default: "" },
      type: { type: String, enum: ["cash", "product", "gift", "vehicle", "tour", "electronics", "other"], default: "gift" },
      value: { type: Number, default: 0 },
      description: { type: String, default: "" },
    },
    salary: {
      amount: { type: Number, default: 0 },
      durationMonths: { type: Number, default: 0 },
      minMonthlySales: { type: Number, default: 0 },
      requiredPersonalShares: { type: Number, default: 0 },
      requiredPersonalPurchaseAmount: { type: Number, default: 0 },
    },
  }],
  branches: [{ type: String }],
  investmentConfig: {
    type: {
      monthly:  { profitPercentage: { type: Number, default: 0 }, minAmount: { type: Number, default: 0 }, bulletPoints: [{ en: String, bn: String }] },
      partial:  { profitPercentage: { type: Number, default: 0 }, minAmount: { type: Number, default: 0 }, bulletPoints: [{ en: String, bn: String }] },
      maturity: { profitPercentage: { type: Number, default: 0 }, minAmount: { type: Number, default: 0 }, bulletPoints: [{ en: String, bn: String }] },
    },
    default: () => ({
      monthly:  { profitPercentage: 0, minAmount: 0, bulletPoints: [] },
      partial:  { profitPercentage: 0, minAmount: 0, bulletPoints: [] },
      maturity: { profitPercentage: 0, minAmount: 0, bulletPoints: [] },
    }),
  },
}, { timestamps: true });

export const Settings = model<ISettings>("Settings", SettingsSchema);
