"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Settings = void 0;
const mongoose_1 = require("mongoose");
const bilingualField = { en: { type: String, default: "" }, bn: { type: String, default: "" } };
const SettingsSchema = new mongoose_1.Schema({
    siteTitle: { type: bilingualField, default: () => ({}) },
    siteTagline: { type: bilingualField, default: () => ({}) },
    aboutMission: { type: bilingualField, default: () => ({}) },
    aboutVision: { type: bilingualField, default: () => ({}) },
    aboutValues: { type: bilingualField, default: () => ({}) },
    logo: { type: String, default: "" },
    favicon: { type: String, default: "" },
    metaDescription: { type: bilingualField, default: () => ({}) },
    metaKeywords: { type: String, default: "" },
    contactPhone: { type: String, default: "" },
    contactEmail: { type: String, default: "" },
    contactAddress: { type: bilingualField, default: () => ({}) },
    socialFacebook: { type: String, default: "" },
    socialYoutube: { type: String, default: "" },
    bkash: { type: String, default: "" },
    nagad: { type: String, default: "" },
    bankName: { type: String, default: "" },
    bankAccount: { type: String, default: "" },
    bankBranch: { type: String, default: "" },
    generationCommission: [{ generation: { type: Number }, rate: { type: Number } }],
    maxGenerations: { type: Number, default: 5 },
    teamManagementDailyLimit: { type: Number, default: 5000 },
    defaultCommissions: {
        directSalesCommissionForCashSell: { type: Number, default: 0 },
        directSalesCommissionForInstallmentSell: { type: Number, default: 0 },
        teamManagementCommissionForCashSell: { type: Number, default: 0 },
        teamManagementCommissionForInstallmentSell: { type: Number, default: 0 },
        managerialCommissionForCashSell: { type: Number, default: 0 },
        managerialCommissionForInstallmentSell: { type: Number, default: 0 },
    },
    managerialCommissionWeeklyProcessDay: { type: Number, default: 0 },
    ranks: [{ name: { type: String }, minDirectSales: { type: Number, default: 0 }, minTeamSales: { type: Number, default: 0 }, order: { type: Number, default: 0 } }],
}, { timestamps: true });
exports.Settings = (0, mongoose_1.model)("Settings", SettingsSchema);
