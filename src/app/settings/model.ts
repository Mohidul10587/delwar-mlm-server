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
  // Commission settings
  generationCommission: { generation: number; rate: number }[];
  maxGenerations: number;
  managerialCommissionWeeklyProcessDay: number;
  // Default share commissions
  defaultCommissions: {
    directSalesCommissionForCashSell: number;
    directSalesCommissionForInstallmentSell: number;
    managerialCommissionForCashSell: number;
    managerialCommissionForInstallmentSell: number;
  };
  // Rank definitions
  ranks: { name: string; minDirectSales: number; minTeamSales: number; order: number }[];
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
  generationCommission: [{ generation: { type: Number }, rate: { type: Number } }],
  maxGenerations:  { type: Number, default: 5 },
  defaultCommissions: {
    directSalesCommissionForCashSell:          { type: Number, default: 0 },
    directSalesCommissionForInstallmentSell:   { type: Number, default: 0 },
    managerialCommissionForCashSell:           { type: Number, default: 0 },
    managerialCommissionForInstallmentSell:    { type: Number, default: 0 },
  },
  managerialCommissionWeeklyProcessDay: { type: Number, default: 0 },
  ranks: [{ name: { type: String }, minDirectSales: { type: Number, default: 0 }, minTeamSales: { type: Number, default: 0 }, order: { type: Number, default: 0 } }],
}, { timestamps: true });

export const Settings = model<ISettings>("Settings", SettingsSchema);
