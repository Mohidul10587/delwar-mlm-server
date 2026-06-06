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
exports.CouponUsage = exports.Coupon = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const couponSchema = new mongoose_1.Schema({
    code: {
        type: String,
        required: true,
        uppercase: true,
        trim: true,
        index: true,
    },
    discountType: {
        type: String,
        required: true,
        enum: ["percentage", "fixed"],
    },
    discountValue: {
        type: Number,
        required: true,
        min: 0,
    },
    startDate: {
        type: Date,
        required: true,
    },
    expiryDate: {
        type: Date,
        required: true,
        validate: {
            validator: function (value) {
                return !this.startDate || value > this.startDate;
            },
            message: "Expiry date must be after start date",
        },
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true,
    },
    seller: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
        index: true,
    },
    applicationType: {
        type: String,
        required: true,
        enum: ["all_products", "selected_products"],
        default: "all_products",
    },
    applicableProducts: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: "Product",
        },
    ],
}, {
    timestamps: true,
});
const couponUsageSchema = new mongoose_1.Schema({
    coupon: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Coupon",
        required: true,
    },
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
    },
    usageCount: {
        type: Number,
        default: 0,
        min: 0,
    },
    lastUsedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});
// Indexes
couponSchema.index({ expiryDate: 1 });
couponSchema.index({ isActive: 1, expiryDate: 1 });
couponSchema.index({ seller: 1, createdAt: -1 });
couponSchema.index({ seller: 1, code: 1 }, { unique: true });
couponUsageSchema.index({ coupon: 1, user: 1 }, { unique: true });
exports.Coupon = mongoose_1.default.model("Coupon", couponSchema);
exports.CouponUsage = mongoose_1.default.model("CouponUsage", couponUsageSchema);
