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
  defaultShareConfig: {
    minDownPayment: number;
    maxDownPayment: number;
    minInstallments: number;
    maxInstallments: number;
    directSaleCommissionValue: number;
    downPaymentGenerationRates: { generation: number; rate: number }[];
    installmentGenerationRates: { generation: number; rate: number }[];
    installmentCommissionRate: number;
  };
  managerialCommissionWeeklyProcessDay: number;
  // Rank definitions
  ranks: {
    name: string;
    minNetworkSalesAmount: number;
    minPersonalPurchaseQtyToAchieve: number;
    reward?: string;
    salary?: {
      amount: number;
      salaryDurationMonths: number;
      minMonthlySalesQty: number;
      minTotalPersonalPurchaseQtyForSalary: number;
    };
  }[];
  // Branches
  branches: string[];
  // Investment config
  investmentConfig: {
    monthly: {
      profitPercentage: number;
      minAmount: number;
      bulletPoints: { en: string; bn: string }[];
    };
    partial: {
      profitPercentage: number;
      minAmount: number;
      bulletPoints: { en: string; bn: string }[];
    };
    maturity: {
      profitPercentage: number;
      minAmount: number;
      bulletPoints: { en: string; bn: string }[];
    };
  };
  // Balance transfer fee
  balanceTransferFeePercent: number;
  // Installment reward rules — admin configurable, no hardcoded values
  installmentRewardRules: {
    targetAmount: number;
    oneTimeReward: number;
    installmentCompletionReward: number;
  }[];
}

const SettingsSchema = new Schema<ISettings>(
  {
    siteTitle: { type: String, default: "" },
    siteTagline: { type: String, default: "" },
    aboutMission: { type: String, default: "" },
    aboutVision: { type: String, default: "" },
    aboutValues: { type: String, default: "" },
    logo: { type: String, default: "" },
    favicon: { type: String, default: "" },
    metaDescription: { type: String, default: "" },
    metaKeywords: { type: String, default: "" },
    contactPhone: { type: String, default: "" },
    contactEmail: { type: String, default: "" },
    contactAddress: { type: String, default: "" },
    socialFacebook: { type: String, default: "" },
    socialYoutube: { type: String, default: "" },
    bkash: { type: String, default: "" },
    nagad: { type: String, default: "" },
    bankName: { type: String, default: "" },
    bankAccount: { type: String, default: "" },
    bankBranch: { type: String, default: "" },
    defaultShareConfig: {
      type: {
        minDownPayment: { type: Number, default: 15000 },
        maxDownPayment: { type: Number, default: 50000 },
        minInstallments: { type: Number, default: 5 },
        maxInstallments: { type: Number, default: 60 },
        directSaleCommissionValue: { type: Number, default: 0 },
        downPaymentGenerationRates: [
          { generation: { type: Number }, rate: { type: Number }, _id: false },
        ],
        installmentCommissionRate: { type: Number, default: 0 },
        installmentGenerationRates: [
          { generation: { type: Number }, rate: { type: Number }, _id: false },
        ],
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
    ranks: [
      {
        name: { type: String },
        minNetworkSalesAmount: { type: Number, default: 0 },
        minPersonalPurchaseQtyToAchieve: { type: Number, default: 0 },
        reward: { type: String, default: "" },
        salary: {
          amount: { type: Number, default: 0 },
          salaryDurationMonths: { type: Number, default: 0 },
          minMonthlySalesQty: { type: Number, default: 0 },
          minTotalPersonalPurchaseQtyForSalary: { type: Number, default: 0 },
        },
      },
    ],
    branches: [{ type: String }],
    investmentConfig: {
      type: {
        monthly: {
          profitPercentage: { type: Number, default: 0 },
          minAmount: { type: Number, default: 0 },
          bulletPoints: [{ en: String, bn: String }],
        },
        partial: {
          profitPercentage: { type: Number, default: 0 },
          minAmount: { type: Number, default: 0 },
          bulletPoints: [{ en: String, bn: String }],
        },
        maturity: {
          profitPercentage: { type: Number, default: 0 },
          minAmount: { type: Number, default: 0 },
          bulletPoints: [{ en: String, bn: String }],
        },
      },
      default: () => ({
        monthly: { profitPercentage: 0, minAmount: 0, bulletPoints: [] },
        partial: { profitPercentage: 0, minAmount: 0, bulletPoints: [] },
        maturity: { profitPercentage: 0, minAmount: 0, bulletPoints: [] },
      }),
    },
    balanceTransferFeePercent: { type: Number, default: 0 },
    installmentRewardRules: [
      {
        targetAmount: { type: Number, required: true },
        oneTimeReward: { type: Number, required: true },
        installmentCompletionReward: { type: Number, required: true },
        _id: false,
      },
    ],
  },
  { timestamps: true }
);

export const Settings = model<ISettings>("Settings", SettingsSchema);
