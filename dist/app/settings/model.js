"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Settings = void 0;
const mongoose_1 = require("mongoose");
const SettingsSchema = new mongoose_1.Schema({
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
    generationCommission: [{ generation: { type: Number }, rate: { type: Number } }],
    maxGenerations: { type: Number, default: 5 },
    defaultCommissions: {
        directSalesCommissionForCashSell: { type: Number, default: 0 },
        directSalesCommissionForInstallmentSell: { type: Number, default: 0 },
        managerialCommissionForCashSell: { type: Number, default: 0 },
        managerialCommissionForInstallmentSell: { type: Number, default: 0 },
    },
    managerialCommissionWeeklyProcessDay: { type: Number, default: 0 },
    ranks: [{ name: { type: String }, minDirectSales: { type: Number, default: 0 }, minTeamSales: { type: Number, default: 0 }, order: { type: Number, default: 0 } }],
    investmentConfig: {
        type: {
            monthly: { profitPercentage: { type: Number, default: 0 }, minAmount: { type: Number, default: 0 }, bulletPoints: [{ en: String, bn: String }] },
            partial: { profitPercentage: { type: Number, default: 0 }, minAmount: { type: Number, default: 0 }, bulletPoints: [{ en: String, bn: String }] },
            maturity: { profitPercentage: { type: Number, default: 0 }, minAmount: { type: Number, default: 0 }, bulletPoints: [{ en: String, bn: String }] },
        },
        default: () => ({
            monthly: { profitPercentage: 0, minAmount: 0, bulletPoints: [] },
            partial: { profitPercentage: 0, minAmount: 0, bulletPoints: [] },
            maturity: { profitPercentage: 0, minAmount: 0, bulletPoints: [] },
        }),
    },
}, { timestamps: true });
exports.Settings = (0, mongoose_1.model)("Settings", SettingsSchema);
