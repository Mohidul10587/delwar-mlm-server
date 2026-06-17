"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Share = void 0;
const mongoose_1 = require("mongoose");
const ShareSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    image: { type: String, required: true },
    images: [{ type: String }],
    cashPrice: { type: Number, required: true },
    minDownPayment: { type: Number, default: 15000 },
    maxDownPayment: { type: Number, default: 50000 },
    minInstallments: { type: Number, default: 5 },
    maxInstallments: { type: Number, default: 60 },
    directSaleCommissionValue: { type: Number, default: 0 },
    downPaymentGenerationRates: [
        {
            generation: { type: Number },
            rate: { type: Number },
            _id: false,
        },
    ],
    installmentCommissionRate: { type: Number, default: 0 },
    cashDownPaymentLimit: { type: Number, default: 50000 },
    isActive: { type: Boolean, default: true },
    projectType: { type: String, default: "" },
    location: { type: String, default: "" },
    developer: { type: String, default: "" },
    videoLink: { type: String, default: "" },
    categoryId: { type: String, default: "" },
    projectStatus: { type: String, enum: ["complete", "running", "upcoming"], default: "upcoming" },
}, { timestamps: true });
exports.Share = (0, mongoose_1.model)("Share", ShareSchema);
