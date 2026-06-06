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
exports.initializeRegularPayment = exports.initializeComboPayment = exports.initializeAffiliatePayment = void 0;
const axios_1 = __importDefault(require("axios"));
const mongoose_1 = __importDefault(require("mongoose"));
const model_1 = __importDefault(require("../order/model"));
const model_2 = __importDefault(require("../product/model"));
const model_3 = __importDefault(require("../settings/model"));
const model_4 = __importDefault(require("../user/model"));
const model_5 = require("../coupon/model");
const model_6 = require("../comboOffer/model");
// Environment variables
const MERCHANT_ID = process.env.AMARPAY_MERCHANT_ID;
const SIGNATURE_KEY = process.env.AMARPAY_SIGNATURE_KEY;
const BASE_URL = "https://sandbox.aamarpay.com";
const redirectUrl = "https://a-b-server.vercel.app";
const clientSideUrl = "https://www.notebookprokash.com";
// Common validation and payment processing
const processPayment = (req, res, next, validationFn, description, handleAfterOrder) => __awaiter(void 0, void 0, void 0, function* () {
    const { amount, transactionId, name, email, phone, orderInfoForStore } = req.body;
    if (!amount || !transactionId) {
        return res.status(400).json({ message: "Required fields are missing" });
    }
    const session = yield mongoose_1.default.startSession();
    try {
        session.startTransaction();
        // Get delivery charge
        const settings = yield model_3.default.findOne().session(session);
        const DELIVERY_CHARGE = (settings === null || settings === void 0 ? void 0 : settings.deliveryCharge) || 60;
        // Validate pricing
        const cartItems = orderInfoForStore.cart;
        const calculatedTotal = yield validationFn(cartItems, session);
        const baseAmount = amount - DELIVERY_CHARGE;
        if (Math.abs(baseAmount - calculatedTotal) > 0.01) {
            yield session.abortTransaction();
            return res.status(400).json({
                message: `Amount mismatch. Expected: ${calculatedTotal}, got: ${baseAmount}`,
            });
        }
        // Create order
        const newOrder = yield model_1.default.create([orderInfoForStore], { session });
        // Handle post-order processing
        if (handleAfterOrder) {
            yield handleAfterOrder(req, newOrder, session);
        }
        // Process payment
        const paymentData = {
            store_id: MERCHANT_ID || "aamarpaytest",
            signature_key: SIGNATURE_KEY || "dbb74894e82415a2f7ff0ec3a97e4183",
            amount,
            desc: description,
            payment_type: "VISA",
            currency: "BDT",
            tran_id: transactionId,
            cus_name: name,
            cus_email: email || "example@gmail.com",
            cus_phone: phone,
            success_url: `${redirectUrl}/payment/success/${transactionId}`,
            fail_url: `${redirectUrl}/payment/fail/${transactionId}`,
            cancel_url: `${clientSideUrl}/checkout`,
            type: "json",
        };
        const response = yield axios_1.default.post(`${BASE_URL}/jsonpost.php`, paymentData);
        if (!response.data.payment_url) {
            throw new Error("Failed to receive payment URL");
        }
        yield session.commitTransaction();
        res.json({ paymentUrl: response.data.payment_url });
    }
    catch (error) {
        yield session.abortTransaction();
        next(error);
    }
    finally {
        session.endSession();
    }
});
// Validation functions
const validateRegularOrder = (cartItems, session) => __awaiter(void 0, void 0, void 0, function* () {
    let calculatedTotal = 0;
    for (const item of cartItems) {
        const product = yield model_2.default.findById(item._id).session(session);
        if (!product) {
            throw new Error(`Product not found`);
        }
        let itemTotal = product.sellingPrice * item.quantity;
        // Apply coupon if present
        if (item.couponId) {
            const coupon = yield model_5.Coupon.findById(item.couponId).session(session);
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
const validateComboOrder = (cartItems, session) => __awaiter(void 0, void 0, void 0, function* () {
    let calculatedTotal = 0;
    for (const item of cartItems) {
        if (item.isCombo) {
            const comboOffer = yield model_6.ComboOffer.findById(item._id).session(session);
            if (!comboOffer || !comboOffer.isActive) {
                throw new Error(`Combo offer not found or inactive`);
            }
            if (item.sellingPrice !== comboOffer.sellingPrice) {
                throw new Error(`Invalid combo price`);
            }
            calculatedTotal += comboOffer.sellingPrice * item.quantity;
        }
        else {
            const product = yield model_2.default.findById(item._id).session(session);
            if (!product) {
                throw new Error(`Product not found`);
            }
            calculatedTotal += product.sellingPrice * item.quantity;
        }
    }
    return calculatedTotal;
});
const validateAffiliateOrder = (cartItems, session) => __awaiter(void 0, void 0, void 0, function* () {
    let calculatedTotal = 0;
    for (const item of cartItems) {
        const product = yield model_2.default.findById(item._id).session(session);
        if (!product) {
            throw new Error(`Product not found`);
        }
        calculatedTotal += product.sellingPrice * item.quantity;
    }
    return calculatedTotal;
});
// Post-order handlers
const handleAffiliateCommission = (req, newOrder, session) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // Set affiliate session
    const cartItems = req.body.orderInfoForStore.cart;
    const affiliateItem = cartItems.find((item) => item.affiliateRef);
    if ((affiliateItem === null || affiliateItem === void 0 ? void 0 : affiliateItem.affiliateRef) && req.session) {
        req.session.affiliateRef = affiliateItem.affiliateRef;
    }
    // Process commission
    if (((_a = req.session) === null || _a === void 0 ? void 0 : _a.affiliateRef) && newOrder[0]) {
        const { affiliateCode, productId } = req.session.affiliateRef;
        const affiliateUser = yield model_4.default.findOne({
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
const handleRegularOrderAffiliate = (req, newOrder, session) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (((_a = req.session) === null || _a === void 0 ? void 0 : _a.affiliateRef) && newOrder[0]) {
        const { affiliateCode, productId } = req.session.affiliateRef;
        const affiliateUser = yield model_4.default.findOne({
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
// Controller functions
const initializeAffiliatePayment = (req, res, next) => {
    return processPayment(req, res, next, validateAffiliateOrder, "Affiliate Order Payment", handleAffiliateCommission);
};
exports.initializeAffiliatePayment = initializeAffiliatePayment;
const initializeComboPayment = (req, res, next) => {
    return processPayment(req, res, next, validateComboOrder, "Combo Order Payment");
};
exports.initializeComboPayment = initializeComboPayment;
const initializeRegularPayment = (req, res, next) => {
    return processPayment(req, res, next, validateRegularOrder, "Regular Order Payment", handleRegularOrderAffiliate);
};
exports.initializeRegularPayment = initializeRegularPayment;
