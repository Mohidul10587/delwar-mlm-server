"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayMethod = exports.paymentMethods = void 0;
const mongoose_1 = require("mongoose");
exports.paymentMethods = [
  "bKash",
  "Nagad",
  "Rocket",
  "Dutch Bangla Bank",
  "Islami Bank",
  "Agrani Bank",
  "Sonali Bank",
  "Janata Bank",
];
const SellerPaymentMethodSchema = new mongoose_1.Schema(
  {
    sellerId: { type: String, required: true },
    paymentType: { type: String, enum: ["bank", "mobile"], required: true },
    method: {
      type: String,
      enum: exports.paymentMethods,
      required: true,
    },
    mobileNumber: {
      type: String,
      required: function () {
        return this.paymentType === "mobile";
      },
    },
    accountNumber: {
      type: String,
      required: function () {
        return this.paymentType === "bank";
      },
    },
    branchAddress: { type: String },
  },
  { timestamps: true }
);
exports.PayMethod = (0, mongoose_1.model)(
  "PayMethod",
  SellerPaymentMethodSchema
);
