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
    minInstallments: number;
    maxInstallments: number;
    directSaleCommissionValue: number;
    downPaymentGenerationRates: { generation: number; rate: number }[];
    installmentGenerationRates: { generation: number; rate: number }[];
    /** @deprecated use installmentGenerationRates */
    installmentCommissionRate: number;
  };
  managerialCommissionWeeklyProcessDay: number;
  // Rank definitions
  ranks: {
    /** Display name of the rank (e.g. "Silver", "Gold") */
    name: string;
    /**
     * Minimum total network approved-sales amount (৳) required to achieve this rank.
     * Renamed from: requiredApprovedSales
     */
    minNetworkSalesAmount: number;
    /**
     * Minimum number of personal (own) approved purchases required to achieve this rank.
     * One-time requirement checked at the time of rank calculation.
     */
    minPersonalPurchaseQtyToAchieve: number;
    reward?: {
      /** Display name of the reward (e.g. "Gold Watch") */
      name: string;
      description: string;
    };
    salary?: {
      /** Monthly salary amount in ৳ */
      amount: number;
      /**
       * How many months the salary is paid after achieving the rank.
       * Renamed from: durationMonths
       */
      salaryDurationMonths: number;
      /**
       * Minimum direct sales qty per month to keep receiving salary.
       * Renamed from: minMonthlySales
       */
      minMonthlySalesQty: number;
      /**
       * Minimum personal purchase qty required to keep receiving salary.
       * Renamed from: requiredPersonalShares
       */
      minMonthlyPersonalPurchaseQtyForSalary: number;
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
  // Balance transfer fee
  balanceTransferFeePercent: number;
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
      minInstallments:      { type: Number, default: 5 },
      maxInstallments:      { type: Number, default: 60 },
      directSaleCommissionValue: { type: Number, default: 0 },
      downPaymentGenerationRates: [{ generation: { type: Number }, rate: { type: Number }, _id: false }],
      installmentCommissionRate: { type: Number, default: 0 },
      installmentGenerationRates: [{ generation: { type: Number }, rate: { type: Number }, _id: false }],
    },
    default: () => ({
      minDownPayment: 15000,
      maxDownPayment: 50000,
      minInstallments: 5,
      maxInstallments: 60,
      directSaleCommissionValue: 0,
      downPaymentGenerationRates: [],
      installmentCommissionRate: 0,
      installmentGenerationRates: [],
    }),
  },
  managerialCommissionWeeklyProcessDay: { type: Number, default: 0 },
  ranks: [{
    name: { type: String },
    // Renamed from: requiredApprovedSales
    minNetworkSalesAmount: { type: Number, default: 0 },
    // Minimum personal (own) approved purchases to achieve this rank (one-time check)
    minPersonalPurchaseQtyToAchieve: { type: Number, default: 0 },
    reward: {
      name: { type: String, default: "" },
      description: { type: String, default: "" },
    },
    salary: {
      amount: { type: Number, default: 0 },
      // Renamed from: durationMonths
      salaryDurationMonths: { type: Number, default: 0 },
      // Renamed from: minMonthlySales
      minMonthlySalesQty: { type: Number, default: 0 },
      // Renamed from: requiredPersonalShares → minPersonalPurchaseQty → minMonthlyPersonalPurchaseQtyForSalary
      minMonthlyPersonalPurchaseQtyForSalary: { type: Number, default: 0 },
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
  balanceTransferFeePercent: { type: Number, default: 0 },
}, { timestamps: true });

export const Settings = model<ISettings>("Settings", SettingsSchema);
