import { Schema, model, Document } from "mongoose";

export interface ISettings extends Document {
  siteTitle: { en: string; bn: string };
  siteTagline: { en: string; bn: string };
  aboutMission: { en: string; bn: string };
  aboutVision: { en: string; bn: string };
  aboutValues: { en: string; bn: string };
  logo: string;
  favicon: string;
  metaDescription: { en: string; bn: string };
  metaKeywords: string;
  contactPhone: string;
  contactEmail: string;
  contactAddress: { en: string; bn: string };
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

const bilingualField = { en: { type: String, default: "" }, bn: { type: String, default: "" } };

const SettingsSchema = new Schema<ISettings>({
  siteTitle:       { type: bilingualField, default: () => ({}) },
  siteTagline:     { type: bilingualField, default: () => ({}) },
  aboutMission:    { type: bilingualField, default: () => ({}) },
  aboutVision:     { type: bilingualField, default: () => ({}) },
  aboutValues:     { type: bilingualField, default: () => ({}) },
  logo:            { type: String, default: "" },
  favicon:         { type: String, default: "" },
  metaDescription: { type: bilingualField, default: () => ({}) },
  metaKeywords:    { type: String, default: "" },
  contactPhone:    { type: String, default: "" },
  contactEmail:    { type: String, default: "" },
  contactAddress:  { type: bilingualField, default: () => ({}) },
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
