"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Share = void 0;
const mongoose_1 = require("mongoose");
const CommissionRateSchema = new mongoose_1.Schema(
  {
    cash: { type: Number, required: true },
    installment: { type: Number, required: true },
  },
  { _id: false }
);
const ShareSchema = new mongoose_1.Schema(
  {
    title: { type: String, required: true },
    image: { type: String, required: true },
    images: [{ type: String }],
    cashPrice: { type: Number, required: true },
    installment: {
      downPayment: { type: Number, required: true },
      perInstallment: { type: Number, required: true },
      totalInstallments: { type: Number, required: true },
    },
    commissions: {
      directSales: { type: CommissionRateSchema, required: true },
      teamManagement: { type: CommissionRateSchema, required: true },
      managerial: { type: CommissionRateSchema, required: true },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
exports.Share = (0, mongoose_1.model)("Share", ShareSchema);
