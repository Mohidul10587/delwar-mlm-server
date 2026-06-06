"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SellerOrder = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const isObjectId_1 = require("../shared/isObjectId");
// Product Schema
const ProductSchema = new mongoose_1.Schema({
    _id: { type: mongoose_1.Schema.Types.ObjectId, ref: "Product", required: true },
    title: { type: String, required: true },
    sellingPrice: { type: Number, required: true },
    img: { type: String, required: true },
    seller: { type: mongoose_1.Schema.Types.ObjectId, required: true, ref: "User" },
    commissionForSeller: { type: Number, required: true },
    quantity: { type: Number, required: true },
    transactionId: { type: String, required: true },
}, { _id: false } // Disable automatic _id for subdocuments
);
// Seller Order Schema
const SellerOrderSchema = new mongoose_1.Schema({
    sellerId: { type: mongoose_1.Schema.Types.ObjectId, required: true, ref: "User" },
    products: { type: [ProductSchema], required: true },
    name: { type: String, required: true },
    address: { type: String },
    phone: { type: String, required: true },
    shippingMethod: { type: String, required: true },
    status: { type: String, required: true },
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        set: (value) => ((0, isObjectId_1.isObjectId)(value) ? value : null),
        default: null,
        ref: "User",
    },
    receiverName: { type: String },
    receiverPhone: { type: String },
    deliveryType: { type: String },
    district: { type: String },
    thana: { type: String },
    village: { type: String },
    postOffice: { type: String },
    postalCode: { type: String },
    courierAddress: { type: String },
    paymentMethod: { type: String, required: true },
    transactionId: { type: String, required: true },
    totalAmount: { type: Number, required: true },
}, { timestamps: true });
// Export Model
exports.SellerOrder = mongoose_1.default.model("SellerOrder", SellerOrderSchema);
