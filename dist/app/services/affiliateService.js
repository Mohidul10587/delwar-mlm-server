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
exports.applyForAffiliate = exports.calculateAffiliateCommission = void 0;
const user_model_1 = __importDefault(require("../user/user.model"));
const model_1 = require("../affiliateTransaction/model");
const AffiliateCommission_1 = require("../admin/affiliateManagement/models/AffiliateCommission");
const AffiliateSettings_1 = require("../admin/affiliateManagement/models/AffiliateSettings");
const model_2 = require("../affiliateClick/model");
const model_3 = __importDefault(require("../product/model"));
const generateCode_1 = require("../shared/generateCode");
const calculateAffiliateCommission = (productId, affiliateCode, orderAmount, orderId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Find affiliate user
        const user = yield user_model_1.default.findOne({
            "affiliateInfo.affiliateCode": affiliateCode,
            "affiliateInfo.isActive": true,
            "affiliateInfo.status": "approved",
        });
        if (!user)
            return null;
        // Find product
        const product = yield model_3.default.findById(productId);
        if (!product || !product.affiliateEnabled)
            return null;
        // Get system settings
        const settings = yield AffiliateSettings_1.AffiliateSettings.findOne();
        const maxLimit = (settings === null || settings === void 0 ? void 0 : settings.maxCommissionLimit) || 1000;
        // Calculate commission
        let commissionAmount = 0;
        let commissionRate = 0;
        if (product.affiliateCommissionType === "percentage") {
            commissionRate = product.affiliateCommission;
            commissionAmount = (orderAmount * commissionRate) / 100;
        }
        else {
            commissionAmount = product.affiliateCommission;
            commissionRate = (commissionAmount / orderAmount) * 100;
        }
        // Apply max limit
        if (commissionAmount > maxLimit) {
            commissionAmount = maxLimit;
        }
        // Create new commission record
        const commission = new AffiliateCommission_1.AffiliateCommission({
            affiliate: user._id,
            product: productId,
            order: orderId,
            commissionAmount,
            commissionRate,
            productPrice: orderAmount,
            status: (settings === null || settings === void 0 ? void 0 : settings.autoApprovalEnabled) &&
                commissionAmount <= (settings.autoApprovalThreshold || 50)
                ? "approved"
                : "pending",
        });
        yield commission.save();
        // If auto-approved, update affiliate balance
        if (commission.status === "approved") {
            user.affiliateInfo.totalEarned += commissionAmount;
            user.affiliateInfo.currentBalance += commissionAmount;
            yield user.save();
        }
        // Create legacy transaction record for backward compatibility
        const transaction = new model_1.AffiliateTransaction({
            affiliate: user._id,
            product: productId,
            order: orderId,
            commissionAmount,
            commissionType: product.affiliateCommissionType,
            commissionRate: product.affiliateCommission,
            productPrice: orderAmount,
            type: "AFFILIATE_COMMISSION",
            flow: "CREDIT",
            previousBalance: user.affiliateInfo.currentBalance -
                (commission.status === "approved" ? commissionAmount : 0),
            currentBalance: user.affiliateInfo.currentBalance,
            status: commission.status === "approved" ? "confirmed" : "pending",
        });
        yield transaction.save();
        // Mark click as converted
        yield model_2.AffiliateClick.updateOne({ affiliate: user._id, product: productId, converted: false }, { converted: true, order: orderId });
        return { user, commissionAmount, transaction, commission };
    }
    catch (error) {
        console.error("Commission calculation error:", error);
        return null;
    }
});
exports.calculateAffiliateCommission = calculateAffiliateCommission;
const applyForAffiliate = (userId, bankDetails) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield user_model_1.default.findById(userId);
        if (!user)
            throw new Error("User not found");
        if (user.affiliateInfo.status === "approved") {
            throw new Error("Already an approved affiliate");
        }
        user.affiliateInfo.status = "pending";
        user.affiliateInfo.bankDetails = bankDetails;
        user.affiliateInfo.appliedAt = new Date();
        if (!user.affiliateInfo.affiliateCode) {
            user.affiliateInfo.affiliateCode = yield (0, generateCode_1.generateUniqueCode)("AFF");
        }
        yield user.save();
        return user;
    }
    catch (error) {
        console.error("Error applying for affiliate:", error);
        throw error;
    }
});
exports.applyForAffiliate = applyForAffiliate;
