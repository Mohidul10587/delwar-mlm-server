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
exports.handleAffiliateCommission = exports.calculateTotal = exports.verifyRupantorPayment = exports.processRupantorPayment = exports.processAamarpayPayment = void 0;
const axios_1 = __importDefault(require("axios"));
const mongoose_1 = __importDefault(require("mongoose"));
const model_1 = __importDefault(require("../order/model"));
const model_2 = __importDefault(require("../settings/model"));
const model_3 = __importDefault(require("../product/model"));
const model_4 = require("../coupon/model");
const model_5 = __importDefault(require("../user/model"));
const cart_model_1 = __importDefault(require("../cart/cart.model"));
const model_6 = require("../sellerOrder/model");
const MERCHANT_ID = process.env.AMARPAY_MERCHANT_ID;
const SIGNATURE_KEY = process.env.AMARPAY_SIGNATURE_KEY;
const AAMARPAY_BASE_URL = "https://sandbox.aamarpay.com";
const redirectUrl = "https://a-b-server.vercel.app";
const clientSideUrl = "https://www.notebookprokash.com";
const RUPANTOR_API_KEY = process.env.RUPANTOR_API_KEY;
const BASE_URL = "https://payment.rupantorpay.com/api";
const processAamarpayPayment = (req, res, next, validationFn, description, handleAfterOrder) => __awaiter(void 0, void 0, void 0, function* () {
    const { amount, deliveryCharge, transactionId, name, email, phone, orderInfoForStore, orderType, } = req.body;
    if (!amount || !deliveryCharge || !transactionId) {
        return res.status(400).json({ message: "Required fields are missing" });
    }
    const session = yield mongoose_1.default.startSession();
    try {
        session.startTransaction();
        const settings = yield model_2.default.findOne().session(session);
        const DELIVERY_CHARGE = (settings === null || settings === void 0 ? void 0 : settings.deliveryCharge) || 60;
        const cartItems = orderInfoForStore.cart;
        const isCacheOnDelivery = orderInfoForStore.paymentMethod === "Cache On Delivery";
        const productTotal = yield validationFn(cartItems, session);
        const totalExpectation = productTotal + DELIVERY_CHARGE;
        const totalPay = Number(amount) + Number(deliveryCharge);
        if (Math.abs(totalPay - totalExpectation) > 0.01) {
            yield session.abortTransaction();
            return res.status(400).json({
                message: `Amount mismatch. Expected: ${totalExpectation}, got: ${totalPay}`,
            });
        }
        // Calculate paidAmount based on payment method
        const paidAmount = isCacheOnDelivery ? DELIVERY_CHARGE : totalPay;
        orderInfoForStore.paidAmount = paidAmount;
        orderInfoForStore.deliveryCharge = DELIVERY_CHARGE;
        orderInfoForStore.netProductsPrice = productTotal;
        const newOrder = yield model_1.default.create([orderInfoForStore], { session });
        // Create seller-specific orders
        const sellerOrdersMap = new Map();
        orderInfoForStore.cart.forEach((item) => {
            const sellerId = item.seller.toString();
            if (!sellerOrdersMap.has(sellerId)) {
                sellerOrdersMap.set(sellerId, []);
            }
            sellerOrdersMap.get(sellerId).push(item);
        });
        const sellerOrders = Array.from(sellerOrdersMap.entries()).map(([sellerId, items]) => ({
            mainOrderId: newOrder[0]._id,
            seller: sellerId,
            cart: items,
            deliveryCharge: DELIVERY_CHARGE,
            deliveryInfo: orderInfoForStore.deliveryInfo,
            paidAmount: items.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0),
            paymentMethod: orderInfoForStore.paymentMethod,
            paymentStatus: orderInfoForStore.paymentStatus,
            paymentTnxId: orderInfoForStore.paymentTnxId,
            status: orderInfoForStore.status,
            user: orderInfoForStore.user,
        }));
        yield model_6.SellerOrder.insertMany(sellerOrders, { session });
        if (handleAfterOrder) {
            yield handleAfterOrder(req, newOrder, session);
        }
        // Clear cart after order creation
        if (orderInfoForStore.user && orderType === "regular") {
            yield cart_model_1.default.findOneAndUpdate({ userId: orderInfoForStore.user }, { $set: { cartItems: [] } }, { session });
        }
        const paymentData = {
            store_id: MERCHANT_ID || "aamarpaytest",
            signature_key: SIGNATURE_KEY || "dbb74894e82415a2f7ff0ec3a97e4183",
            amount: isCacheOnDelivery ? DELIVERY_CHARGE : totalPay,
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
        const response = yield axios_1.default.post(`${AAMARPAY_BASE_URL}/jsonpost.php`, paymentData);
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
exports.processAamarpayPayment = processAamarpayPayment;
const processRupantorPayment = (req, res, next, validationFn, handleAfterOrder) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { amount, deliveryCharge, transactionId, name, email, phone, orderInfoForStore, orderType, } = req.body;
    if (!amount || !deliveryCharge || !transactionId) {
        return res.status(400).json({ message: "Required fields are missing" });
    }
    const session = yield mongoose_1.default.startSession();
    try {
        session.startTransaction();
        const settings = yield model_2.default.findOne().session(session);
        const DELIVERY_CHARGE = (settings === null || settings === void 0 ? void 0 : settings.deliveryCharge) || 60;
        const cartItems = orderInfoForStore.cart;
        const isCacheOnDelivery = orderInfoForStore.paymentMethod === "Cache On Delivery";
        const productTotal = yield validationFn(cartItems, session);
        const totalExpectation = productTotal + DELIVERY_CHARGE;
        const totalPay = Number(amount) + Number(deliveryCharge);
        if (Math.abs(totalPay - totalExpectation) > 0.01) {
            yield session.abortTransaction();
            return res.status(400).json({
                message: `Amount mismatch. Expected: ${totalExpectation}, got: ${totalPay}`,
            });
        }
        // Calculate paidAmount based on payment method
        const paidAmount = isCacheOnDelivery ? DELIVERY_CHARGE : totalPay;
        orderInfoForStore.paidAmount = paidAmount;
        orderInfoForStore.deliveryCharge = DELIVERY_CHARGE;
        orderInfoForStore.netProductsPrice = productTotal;
        const newOrder = yield model_1.default.create([orderInfoForStore], { session });
        // Create seller-specific orders
        const sellerOrdersMap = new Map();
        orderInfoForStore.cart.forEach((item) => {
            const sellerId = item.seller.toString();
            if (!sellerOrdersMap.has(sellerId)) {
                sellerOrdersMap.set(sellerId, []);
            }
            sellerOrdersMap.get(sellerId).push(item);
        });
        const sellerOrders = Array.from(sellerOrdersMap.entries()).map(([sellerId, items]) => ({
            mainOrderId: newOrder[0]._id,
            seller: sellerId,
            cart: items,
            deliveryCharge: DELIVERY_CHARGE,
            deliveryInfo: orderInfoForStore.deliveryInfo,
            paidAmount: items.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0),
            paymentMethod: orderInfoForStore.paymentMethod,
            paymentStatus: orderInfoForStore.paymentStatus,
            paymentTnxId: orderInfoForStore.paymentTnxId,
            status: orderInfoForStore.status,
            user: orderInfoForStore.user,
        }));
        yield model_6.SellerOrder.insertMany(sellerOrders, { session });
        if (handleAfterOrder) {
            yield handleAfterOrder(req, newOrder, session);
        }
        // Clear cart after order creation
        if (orderInfoForStore.user && orderType === "regular") {
            console.log("first");
            yield cart_model_1.default.findOneAndUpdate({ userId: orderInfoForStore.user }, { $set: { cartItems: [] } }, { session });
        }
        const paymentData = {
            fullname: name,
            email: email || "example@gmail.com",
            amount: (isCacheOnDelivery ? DELIVERY_CHARGE : totalPay).toString(),
            success_url: `${redirectUrl}/payment/rupantor/success/${transactionId}`,
            cancel_url: `${clientSideUrl}/checkout`,
            webhook_url: `${redirectUrl}/payment/rupantor/webhook/${transactionId}`,
            meta_data: {
                phone,
                transaction_id: transactionId,
            },
        };
        const response = yield axios_1.default.post(`${BASE_URL}/payment/checkout`, paymentData, {
            headers: {
                "X-API-KEY": RUPANTOR_API_KEY,
                "Content-Type": "application/json",
                "X-CLIENT": req.get("host") || "localhost",
            },
            timeout: 30000,
            httpsAgent: new (require("https").Agent)({
                rejectUnauthorized: false,
            }),
        });
        if (!response.data.payment_url) {
            throw new Error("Failed to receive payment URL");
        }
        yield session.commitTransaction();
        res.json({ paymentUrl: response.data.payment_url });
    }
    catch (error) {
        yield session.abortTransaction();
        console.error("Rupantor Payment Error:", ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
        next(error);
    }
    finally {
        session.endSession();
    }
});
exports.processRupantorPayment = processRupantorPayment;
const verifyRupantorPayment = (transactionId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const response = yield axios_1.default.post(`${BASE_URL}/payment/verify-payment`, {
            transaction_id: transactionId,
        }, {
            headers: {
                "X-API-KEY": RUPANTOR_API_KEY,
                "Content-Type": "application/json",
            },
            timeout: 30000,
            httpsAgent: new (require("https").Agent)({
                rejectUnauthorized: false,
            }),
        });
        return response.data;
    }
    catch (error) {
        console.error("Rupantor Verify Error:", ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
        throw new Error("Payment verification failed");
    }
});
exports.verifyRupantorPayment = verifyRupantorPayment;
const calculateTotal = (cartItems, session) => __awaiter(void 0, void 0, void 0, function* () {
    let calculatedTotal = 0;
    for (const item of cartItems) {
        const product = yield model_3.default.findById(item._id).session(session);
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
            if (coupon.applicationType === "selected_products") {
                const isApplicable = coupon.applicableProducts.some((id) => id.toString() === item._id.toString());
                if (!isApplicable) {
                    throw new Error(`Coupon ${coupon.code} is not applicable to this product`);
                }
            }
            let discount = coupon.discountType === "percentage"
                ? (itemTotal * coupon.discountValue) / 100
                : coupon.discountValue;
            itemTotal -= discount;
        }
        calculatedTotal += itemTotal;
    }
    return calculatedTotal;
});
exports.calculateTotal = calculateTotal;
const handleAffiliateCommission = (req, newOrder, session) => __awaiter(void 0, void 0, void 0, function* () {
    const cartItems = req.body.orderInfoForStore.cart;
    const affiliateItem = cartItems.find((item) => item.affiliateRef);
    if ((affiliateItem === null || affiliateItem === void 0 ? void 0 : affiliateItem.affiliateRef) && newOrder[0]) {
        const { affiliateCode, productId } = affiliateItem.affiliateRef;
        const affiliateUser = yield model_5.default.findOne({
            "affiliateInfo.affiliateCode": affiliateCode,
            "affiliateInfo.isActive": true,
            "affiliateInfo.status": "approved",
        }).session(session);
        const product = yield model_3.default.findById(productId).session(session);
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
exports.handleAffiliateCommission = handleAffiliateCommission;
