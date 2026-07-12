"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Project = void 0;
const mongoose_1 = require("mongoose");
const ProjectSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    description: { type: String, default: "" },
    images: [{ type: String }],
    cashPrice: { type: Number, required: true },
    regularPrice: { type: Number },
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
    installmentGenerationRates: [
        {
            generation: { type: Number },
            rate: { type: Number },
            _id: false,
        },
    ],
    isActive: { type: Boolean, default: true },
    totalShares: { type: Number, required: true, default: 0 },
    projectType: { type: String, default: "" },
    location: { type: String, default: "" },
    developer: { type: String, default: "" },
    videoLink: { type: String, default: "" },
    categoryId: { type: String, default: "" },
    projectStatus: {
        type: String,
        enum: ["complete", "running", "upcoming"],
        default: "running",
    },
    // Offer fields
    isOffer: { type: Boolean, default: false },
    offerText: { type: String, default: null },
    offerStartDate: { type: Date, default: null },
    offerEndDate: { type: Date, default: null },
    offerPriority: { type: Number, default: 0 },
    // Cover slider — admin selects which share's images appear as cover
    isCoverSlider: { type: Boolean, default: false },
    // Cashback % for cash purchases — auto-credited on approval (non-withdrawable, non-transferable)
    cashbackPercent: { type: Number, default: 0 },
}, { timestamps: true });
exports.Project = (0, mongoose_1.model)("Project", ProjectSchema);
