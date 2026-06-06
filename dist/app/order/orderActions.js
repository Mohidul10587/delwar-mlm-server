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
exports.cancelOrder = exports.returnOrder = exports.deliver = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const model_1 = __importDefault(require("./model"));
const model_2 = __importDefault(require("../user/model"));
const model_3 = require("../sellerWallet/model");
const model_4 = require("../adminWallet/model");
const model_5 = __importDefault(require("../transaction/model"));
const model_6 = require("../siteWallet/model");
const model_7 = require("../affiliateWallet/model");
const model_8 = require("../sellerOrder/model");
const smsService_1 = __importDefault(require("../shared/smsService"));
const deliver = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const { orderId } = req.params;
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const order = yield model_1.default.findById(orderId).session(session);
        if (!order)
            throw new Error("Order not found");
        if (order.status === "Delivered") {
            return res.status(401).json({ message: "Order already delivered" });
        }
        const sellerMap = new Map();
        const sellerCouponDiscountMap = new Map();
        let totalSellingPrice = 0;
        order.cart.forEach((item) => {
            const sellerId = item.seller.toString();
            const total = item.sellingPrice * item.quantity;
            const couponDiscount = (item.couponDiscount || 0) * item.quantity;
            sellerMap.set(sellerId, (sellerMap.get(sellerId) || 0) + total);
            sellerCouponDiscountMap.set(sellerId, (sellerCouponDiscountMap.get(sellerId) || 0) + couponDiscount);
            totalSellingPrice += total;
        });
        let totalSiteIncome = 0;
        let totalAffiliateCommission = 0;
        if ((_a = order.affiliateRef) === null || _a === void 0 ? void 0 : _a.affiliate) {
            const { commissionRate, commissionType } = order.affiliateRef;
            totalAffiliateCommission =
                commissionType === "percentage"
                    ? (totalSellingPrice * commissionRate) / 100
                    : commissionRate;
        }
        for (const [sellerId, sellerGross] of sellerMap.entries()) {
            const seller = yield model_2.default.findById(sellerId).session(session);
            if (!seller)
                continue;
            const adminCommissionRate = ((_b = seller.sellerInfo) === null || _b === void 0 ? void 0 : _b.commissionForAdmin) || 0;
            const adminCommissionAmount = (sellerGross * adminCommissionRate) / 100;
            const sellerPortion = sellerGross / totalSellingPrice;
            const sellerAffiliateDeduction = totalAffiliateCommission * sellerPortion;
            const sellerCouponDiscount = sellerCouponDiscountMap.get(sellerId) || 0;
            const sellerNetAmount = sellerGross - adminCommissionAmount - sellerAffiliateDeduction - sellerCouponDiscount;
            totalSiteIncome += sellerGross;
            yield model_3.SellerWallet.findOneAndUpdate({ seller: sellerId }, { $inc: { balance: sellerNetAmount, totalEarned: sellerNetAmount } }, { upsert: true, session });
            yield model_4.AdminWallet.findOneAndUpdate({}, {
                $inc: {
                    balance: adminCommissionAmount,
                    totalIncome: adminCommissionAmount,
                },
            }, { upsert: true, session });
            yield model_5.default.create([
                {
                    order: order._id,
                    seller: sellerId,
                    amount: sellerNetAmount,
                    sourceAmount: sellerGross,
                    commissionAmount: adminCommissionAmount + sellerAffiliateDeduction + sellerCouponDiscount,
                    type: "ORDER_DELIVERED",
                    flow: "CREDIT",
                    owner: "SELLER",
                },
                {
                    order: order._id,
                    admin: null,
                    amount: adminCommissionAmount,
                    sourceAmount: sellerGross,
                    commissionAmount: adminCommissionAmount,
                    type: "ADMIN_INCOME",
                    flow: "CREDIT",
                    owner: "ADMIN",
                },
            ], { session });
        }
        yield model_6.SiteWallet.findOneAndUpdate({}, { $inc: { balance: totalSiteIncome, totalIncome: totalSiteIncome } }, { upsert: true, session });
        yield model_5.default.create([
            {
                order: order._id,
                amount: totalSiteIncome,
                sourceAmount: totalSiteIncome,
                type: "ORDER_DELIVERED",
                flow: "CREDIT",
                owner: "SITE",
            },
        ], { session });
        if (((_c = order.affiliateRef) === null || _c === void 0 ? void 0 : _c.affiliate) && totalAffiliateCommission > 0) {
            const maxLimit = 10000000;
            const maxLimitApplied = totalAffiliateCommission >= maxLimit;
            yield model_7.AffiliateWallet.findOneAndUpdate({ affiliate: order.affiliateRef.affiliate }, {
                $inc: {
                    balance: totalAffiliateCommission,
                    totalEarned: totalAffiliateCommission,
                },
            }, { upsert: true, session });
            yield model_5.default.create([
                {
                    order: order._id,
                    affiliate: order.affiliateRef.affiliate,
                    amount: totalAffiliateCommission,
                    sourceAmount: totalSellingPrice,
                    commissionAmount: totalAffiliateCommission,
                    type: "AFFILIATE_COMMISSION",
                    flow: "CREDIT",
                    owner: "AFFILIATE",
                    affiliateMeta: {
                        product: order.affiliateRef.productId || null,
                        commissionType: order.affiliateRef.commissionType || "percentage",
                        commissionRate: order.affiliateRef.commissionRate || 0,
                        maxLimitApplied,
                        status: "approved",
                    },
                    note: `Affiliate commission for order ${order._id}`,
                },
            ], { session });
        }
        order.status = "Delivered";
        order.paymentStatus = true;
        yield order.save({ session });
        // Update seller orders status
        yield model_8.SellerOrder.updateMany({ mainOrderId: order._id }, { $set: { status: "Delivered", paymentStatus: true } }, { session });
        yield session.commitTransaction();
        session.endSession();
        if (order.deliveryInfo.phone) {
            const smsData = {
                customerName: order.deliveryInfo.name,
                phone: order.deliveryInfo.phone,
                orderId: order._id.toString(),
                totalAmount: order.paidAmount,
                status: "Delivered",
                products: order.cart.map((item) => ({
                    title: item.title,
                    quantity: item.quantity,
                })),
            };
            smsService_1.default.sendOrderSMS(smsData);
        }
        res.status(200).json({
            success: true,
            message: "Order delivered & income distributed successfully",
        });
    }
    catch (error) {
        yield session.abortTransaction();
        session.endSession();
        res.status(400).json({ success: false, message: error.message });
    }
});
exports.deliver = deliver;
const returnOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const { orderId } = req.params;
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const order = yield model_1.default.findById(orderId).session(session);
        if (!order)
            throw new Error("Order not found");
        if (order.status !== "Delivered") {
            throw new Error("Only delivered orders can be returned");
        }
        const sellerMap = new Map();
        const sellerCouponDiscountMap = new Map();
        let totalSellingPrice = 0;
        order.cart.forEach((item) => {
            const sellerId = item.seller.toString();
            const total = item.sellingPrice * item.quantity;
            const couponDiscount = (item.couponDiscount || 0) * item.quantity;
            sellerMap.set(sellerId, (sellerMap.get(sellerId) || 0) + total);
            sellerCouponDiscountMap.set(sellerId, (sellerCouponDiscountMap.get(sellerId) || 0) + couponDiscount);
            totalSellingPrice += total;
        });
        let totalAffiliateCommission = 0;
        if ((_a = order.affiliateRef) === null || _a === void 0 ? void 0 : _a.affiliate) {
            const { commissionRate, commissionType } = order.affiliateRef;
            totalAffiliateCommission =
                commissionType === "percentage"
                    ? (totalSellingPrice * commissionRate) / 100
                    : commissionRate;
        }
        let totalSiteDebit = 0;
        for (const [sellerId, sellerGross] of sellerMap.entries()) {
            const seller = yield model_2.default.findById(sellerId).session(session);
            if (!seller)
                continue;
            const adminRate = ((_b = seller.sellerInfo) === null || _b === void 0 ? void 0 : _b.commissionForAdmin) || 0;
            const adminCommission = (sellerGross * adminRate) / 100;
            const sellerPortion = sellerGross / totalSellingPrice;
            const sellerAffiliateDeduction = totalAffiliateCommission * sellerPortion;
            const sellerCouponDiscount = sellerCouponDiscountMap.get(sellerId) || 0;
            const sellerNetAmount = sellerGross - adminCommission - sellerAffiliateDeduction - sellerCouponDiscount;
            totalSiteDebit += sellerGross;
            yield model_3.SellerWallet.findOneAndUpdate({ seller: sellerId }, { $inc: { balance: -sellerNetAmount } }, { session });
            yield model_4.AdminWallet.findOneAndUpdate({}, {
                $inc: {
                    balance: -adminCommission,
                    totalIncome: -adminCommission,
                },
            }, { session });
            yield model_5.default.create([
                {
                    order: order._id,
                    seller: sellerId,
                    amount: sellerNetAmount,
                    sourceAmount: sellerGross,
                    commissionAmount: adminCommission + sellerAffiliateDeduction + sellerCouponDiscount,
                    type: "ORDER_RETURNED",
                    flow: "DEBIT",
                    owner: "SELLER",
                    note: "Order returned – seller income reversed",
                },
                {
                    order: order._id,
                    amount: adminCommission,
                    sourceAmount: sellerGross,
                    commissionAmount: adminCommission,
                    type: "ORDER_RETURNED",
                    flow: "DEBIT",
                    owner: "ADMIN",
                    note: "Order returned – admin commission reversed",
                },
            ], { session });
        }
        yield model_6.SiteWallet.findOneAndUpdate({}, {
            $inc: {
                balance: -totalSiteDebit,
                totalIncome: -totalSiteDebit,
            },
        }, { session });
        yield model_5.default.create([
            {
                order: order._id,
                amount: totalSiteDebit,
                sourceAmount: totalSiteDebit,
                type: "ORDER_RETURNED",
                flow: "DEBIT",
                owner: "SITE",
                note: "Order returned – site income reversed",
            },
        ], { session });
        if (((_c = order.affiliateRef) === null || _c === void 0 ? void 0 : _c.affiliate) && totalAffiliateCommission > 0) {
            yield model_7.AffiliateWallet.findOneAndUpdate({ affiliate: order.affiliateRef.affiliate }, { $inc: { balance: -totalAffiliateCommission } }, { session });
            yield model_5.default.create([
                {
                    order: order._id,
                    affiliate: order.affiliateRef.affiliate,
                    amount: totalAffiliateCommission,
                    sourceAmount: totalSellingPrice,
                    commissionAmount: totalAffiliateCommission,
                    type: "ORDER_RETURNED",
                    flow: "DEBIT",
                    owner: "AFFILIATE",
                    note: "Order returned – affiliate commission reversed",
                },
            ], { session });
        }
        order.status = "Returned";
        yield order.save({ session });
        // Update seller orders status
        yield model_8.SellerOrder.updateMany({ mainOrderId: order._id }, { $set: { status: "Returned" } }, { session });
        yield session.commitTransaction();
        session.endSession();
        res.status(200).json({
            success: true,
            message: "Order returned & all balances reversed successfully",
        });
    }
    catch (error) {
        yield session.abortTransaction();
        session.endSession();
        res.status(400).json({ success: false, message: error.message });
    }
});
exports.returnOrder = returnOrder;
const cancelOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { orderId } = req.params;
    try {
        const order = yield model_1.default.findById(orderId);
        if (!order)
            throw new Error("Order not found");
        if (order.status === "Delivered")
            throw new Error("Cannot cancel delivered order. Use return instead.");
        if (order.status === "Cancelled")
            throw new Error("Order already cancelled");
        order.status = "Cancelled";
        yield order.save();
        // Update seller orders status
        yield model_8.SellerOrder.updateMany({ mainOrderId: order._id }, { $set: { status: "Cancelled" } });
        if (order.deliveryInfo.phone) {
            const smsData = {
                customerName: order.deliveryInfo.name,
                phone: order.deliveryInfo.phone,
                orderId: order._id.toString(),
                totalAmount: order.paidAmount,
                status: "Cancelled",
                products: order.cart.map((item) => ({
                    title: item.title,
                    quantity: item.quantity,
                })),
            };
            smsService_1.default.sendOrderSMS(smsData);
        }
        res.status(200).json({
            success: true,
            message: "Order cancelled successfully",
        });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});
exports.cancelOrder = cancelOrder;
