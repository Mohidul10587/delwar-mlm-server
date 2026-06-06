"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aamarpayAffiliatePayment = void 0;
const shared_1 = require("../shared");
const aamarpayAffiliatePayment = (req, res, next) => {
    return (0, shared_1.processAamarpayPayment)(req, res, next, shared_1.calculateTotal, "Affiliate Order Payment", shared_1.handleAffiliateCommission);
};
exports.aamarpayAffiliatePayment = aamarpayAffiliatePayment;
