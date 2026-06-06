"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeRegularPayment = void 0;
const model_1 = __importDefault(require("../order/model"));
const model_2 = __importDefault(require("../product/model"));
const model_3 = __importDefault(require("../user/model"));
const model_4 = require("../coupon/model");
const shared_1 = require("./shared");
const validateRegularOrder = (cartItems, session) => __awaiter(void 0, void 0, void 0, function* () {
    let calculatedTotal = 0;
    for (const item of cartItems) {
        const product = yield model_2.default.findById(item._id).session(session);
        if (!product) {
            throw new Error(`Product not found`);
        }
        let itemTotal = product.sellingPrice * item.quantity;
        if (item.couponId) {
            const coupon = yield model_4.Coupon.findById(item.couponId).session(session);
            if (!coupon) {
                throw new Error(`Invalid coupon`);
            }
            const now = new Date();
            if (!coupon.isActive ||
                now < coupon.startDate ||
                now > coupon.expiryDate) {
                throw new Error(`Coupon ${coupon.code} expired`);
            }
            if (coupon.usedCount >= coupon.usageLimit) {
                throw new Error(`Coupon ${coupon.code} limit exceeded`);
            }
            if (coupon.applicationType === "selected_products") {
                const isApplicable = coupon.applicableProducts.some((id) => id.toString() === item._id.toString());
                if (!isApplicable) {
                    throw new Error(`Coupon ${coupon.code} is not applicable to this product`);
                }
            }
            let discount = coupon.discountType === "percentage"
                ? (itemTotal * coupon.discountValue) / 100
                : coupon.discountValue;
            if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
                discount = coupon.maxDiscountAmount;
            }
            itemTotal -= discount;
        }
        calculatedTotal += itemTotal;
    }
    return calculatedTotal;
});
const handleRegularOrderAffiliate = (req, newOrder, session) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (((_a = req.session) === null || _a === void 0 ? void 0 : _a.affiliateRef) && newOrder[0]) {
        const { affiliateCode, productId } = req.session.affiliateRef;
        const affiliateUser = yield model_3.default.findOne({
            "affiliateInfo.affiliateCode": affiliateCode,
            "affiliateInfo.isActive": true,
            "affiliateInfo.status": "approved",
        }).session(session);
        const product = yield model_2.default.findById(productId).session(session);
        if (product && product.affiliateEnabled && affiliateUser) {
            yield model_1.default.findByIdAndUpdate(newOrder[0]._id, {
                $set: {
                    "affiliateRef.affiliate": affiliateUser._id,
                    "affiliateRef.affiliateCode": affiliateCode,
                    "affiliateRef.productId": productId,
                    "affiliateRef.commissionRate": product.affiliateCommission,
                    "affiliateRef.commissionType": product.affiliateCommissionType,
                },
            }, { session });
        }
    }
});
const initializeRegularPayment = (req, res, next) => {
    return (0, shared_1.processPayment)(req, res, next, validateRegularOrder, "Regular Order Payment", handleRegularOrderAffiliate);
};
exports.initializeRegularPayment = initializeRegularPayment;
