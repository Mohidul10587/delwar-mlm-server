"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Share = void 0;
const mongoose_1 = require("mongoose");
const ShareSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    image: { type: String, required: true },
    images: [{ type: String }],
    cashPrice: { type: Number, required: true },
    installment: {
        downPayment: { type: Number, required: true },
        perInstallment: { type: Number, required: true },
        totalInstallments: { type: Number, required: true },
    },
    directSalesCommissionForCashSell: { type: Number, default: 0 },
    directSalesCommissionForInstallmentSell: { type: Number, default: 0 },
    managerialCommissionForCashSell: { type: Number, default: 0 },
    managerialCommissionForInstallmentSell: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });
exports.Share = (0, mongoose_1.model)("Share", ShareSchema);
