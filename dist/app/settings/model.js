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
}, { timestamps: true });
exports.Settings = (0, mongoose_1.model)("Settings", SettingsSchema);
