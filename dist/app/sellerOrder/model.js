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
// Seller Order Schema
const SellerOrderSchema = new mongoose_1.Schema({
    mainOrderId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Order",
        required: true,
    },
    seller: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    cart: [
        {
            _id: { type: mongoose_1.Schema.Types.ObjectId, ref: "Product" },
            couponId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Coupon" },
            couponDiscount: { type: Number },
            existingQnt: { type: Number, required: true },
            img: { type: String, required: true },
            isChecked: { type: Boolean, default: true },
            quantity: { type: Number, required: true },
            seller: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
            sellingPrice: { type: Number, required: true },
            title: { en: String, bn: String },
        },
    ],
    deliveryCharge: { type: Number, required: true },
    deliveryInfo: {
        address: { type: String },
        courierAddress: { type: String },
        deliveryType: { type: String },
        district: { type: String },
        name: { type: String, required: true },
        phone: { type: String, required: true },
        postOffice: { type: String },
        postalCode: { type: String },
        receiverName: { type: String },
        receiverPhone: { type: String },
        thana: { type: String },
        village: { type: String },
    },
    paidAmount: { type: Number, required: true },
    paymentMethod: {
        type: String,
        enum: ["Pay By Online", "Cache On Delivery"],
        required: true,
    },
    paymentStatus: { type: Boolean, default: false },
    paymentTnxId: { type: String, required: true },
    status: {
        type: String,
        enum: ["Pending", "Delivered", "Cancelled", "Returned"],
        default: "Pending",
    },
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });
exports.SellerOrder = mongoose_1.default.model("SellerOrder", SellerOrderSchema);
