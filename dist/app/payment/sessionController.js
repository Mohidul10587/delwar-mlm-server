"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setAffiliateSession = void 0;
const setAffiliateSession = (req, res) => {
    const { affiliateCode, productId } = req.body;
    if (affiliateCode && productId && req.session) {
        req.session.affiliateRef = { affiliateCode, productId };
        res.json({ success: true });
    }
    else {
        res.status(400).json({ message: "Invalid affiliate data" });
    }
};
exports.setAffiliateSession = setAffiliateSession;
