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
exports.generateAffiliateLink = exports.getAffiliateDashboard = exports.applyAffiliate = void 0;
const model_1 = __importDefault(require("../user/model"));
const generateCode_1 = require("../shared/generateCode");
// Apply to become affiliate
const applyAffiliate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { bankDetails } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const user = yield model_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (user.affiliateInfo.status === "approved") {
            return res.status(400).json({ message: "Already an approved affiliate" });
        }
        if (user.affiliateInfo.status === "pending") {
            return res.status(400).json({ message: "Application already pending" });
        }
        if (!user.affiliateInfo.affiliateCode) {
            user.affiliateInfo.affiliateCode = yield (0, generateCode_1.generateUniqueCode)("AFF");
        }
        user.affiliateInfo.status = "pending";
        user.affiliateInfo.isActive = false;
        user.affiliateInfo.bankDetails = bankDetails;
        user.affiliateInfo.appliedAt = new Date();
        yield user.save();
        res.json({
            message: "Affiliate application submitted successfully",
            affiliateInfo: user.affiliateInfo,
        });
    }
    catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
});
exports.applyAffiliate = applyAffiliate;
// Get affiliate dashboard data
const getAffiliateDashboard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const user = yield model_1.default.findById(userId).select("affiliateInfo");
        if (!user || !user.affiliateInfo.isActive) {
            return res.status(404).json({ message: "Affiliate not active" });
        }
        res.json({ affiliateInfo: user.affiliateInfo });
    }
    catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
});
exports.getAffiliateDashboard = getAffiliateDashboard;
// Generate affiliate link
const generateAffiliateLink = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { productId } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const user = yield model_1.default.findById(userId).select("affiliateInfo");
        if (!user || !user.affiliateInfo.isActive) {
            return res.status(403).json({ message: "Affiliate not active" });
        }
        const affiliateLink = `${process.env.FRONTEND_URL}/affiliate/${productId}?ref=${user.affiliateInfo.affiliateCode}`;
        res.json({ affiliateLink });
    }
    catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
});
exports.generateAffiliateLink = generateAffiliateLink;
