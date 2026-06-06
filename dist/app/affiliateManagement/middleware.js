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
exports.trackAffiliateClick = void 0;
const model_1 = __importDefault(require("../user/model"));
const model_2 = require("../affiliateClick/model");
const trackAffiliateClick = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ref } = req.query;
        const { productId } = req.params;
        if (ref && productId) {
            const user = yield model_1.default.findOne({
                "affiliateInfo.affiliateCode": ref,
                "affiliateInfo.isActive": true,
            });
            if (user) {
                const click = new model_2.AffiliateClick({
                    affiliate: user._id,
                    product: productId,
                    ipAddress: req.ip || req.connection.remoteAddress,
                    userAgent: req.get("User-Agent") || "",
                });
                yield click.save();
                // Store affiliate info in session for order tracking
                req.session.affiliateRef = {
                    affiliateId: user._id,
                    affiliateCode: ref,
                    productId,
                };
            }
        }
        next();
    }
    catch (error) {
        console.error("Affiliate tracking error:", error);
        next();
    }
});
exports.trackAffiliateClick = trackAffiliateClick;
