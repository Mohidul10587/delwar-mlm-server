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
exports.initializeAffiliatePayment = void 0;
const model_1 = __importDefault(require("../order/model"));
const model_2 = __importDefault(require("../product/model"));
const model_3 = __importDefault(require("../user/model"));
const shared_1 = require("./shared");
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
const handleAffiliateCommission = (req, newOrder, session) => __awaiter(void 0, void 0, void 0, function* () {
    const cartItems = req.body.orderInfoForStore.cart;
    const affiliateItem = cartItems.find((item) => item.affiliateRef);
    if ((affiliateItem === null || affiliateItem === void 0 ? void 0 : affiliateItem.affiliateRef) && newOrder[0]) {
        const { affiliateCode, productId } = affiliateItem.affiliateRef;
        console.log(affiliateCode, productId);
        const affiliateUser = yield model_3.default.findOne({
            "affiliateInfo.affiliateCode": affiliateCode,
            "affiliateInfo.isActive": true,
            "affiliateInfo.status": "approved",
        }).session(session);
        const product = yield model_2.default.findById(productId).session(session);
        console.log("affiliateUser", affiliateUser);
        console.log("product", product);
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
const initializeAffiliatePayment = (req, res, next) => {
    return (0, shared_1.processPayment)(req, res, next, validateAffiliateOrder, "Affiliate Order Payment", handleAffiliateCommission);
};
exports.initializeAffiliatePayment = initializeAffiliatePayment;
