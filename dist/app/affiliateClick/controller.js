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
exports.getAffiliateClicks = exports.trackAffiliateClick = void 0;
const model_1 = require("./model");
const model_2 = __importDefault(require("../user/model"));
const trackAffiliateClick = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { affiliateCode, productId } = req.body;
        const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
        const userAgent = req.get('User-Agent') || 'unknown';
        // Find affiliate user by code
        const affiliateUser = yield model_2.default.findOne({
            'affiliateInfo.affiliateCode': affiliateCode,
            'affiliateInfo.isActive': true,
            'affiliateInfo.status': 'approved'
        });
        if (!affiliateUser) {
            return res.status(404).json({ message: 'Invalid affiliate code' });
        }
        // Create click record
        yield model_1.AffiliateClick.create({
            affiliate: affiliateUser._id,
            product: productId,
            ipAddress,
            userAgent
        });
        // Store in session for checkout
        req.session.affiliateRef = { affiliateCode, productId };
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
exports.trackAffiliateClick = trackAffiliateClick;
const getAffiliateClicks = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Implementation needed
});
exports.getAffiliateClicks = getAffiliateClicks;
