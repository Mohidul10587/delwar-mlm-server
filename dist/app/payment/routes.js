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
const express_1 = __importDefault(require("express"));
const cart_model_1 = __importDefault(require("../cart/cart.model"));
const model_1 = __importDefault(require("../order/model"));
const affiliateController_1 = require("./amarpay/affiliateController");
const comboController_1 = require("./amarpay/comboController");
const regularController_1 = require("./amarpay/regularController");
const affiliateController_2 = require("./rupantor/affiliateController");
const comboController_2 = require("./rupantor/comboController");
const regularController_2 = require("./rupantor/regularController");
const shared_1 = require("./shared");
const router = express_1.default.Router();
const clientSideUrl = "https://www.notebookprokash.com";
// Payment initialization routes
router.post("/aamarpay/affiliate", affiliateController_1.aamarpayAffiliatePayment);
router.post("/aamarpay/combo", comboController_1.aamarpayComboPayment);
router.post("/aamarpay/regular", regularController_1.aamarpayRegularPayment);
// Rupantor Pay routes
router.post("/rupantorpay/affiliate", affiliateController_2.rupantorAffiliatePayment);
router.post("/rupantorpay/combo", comboController_2.rupantorComboPayment);
router.post("/rupantorpay/regular", regularController_2.rupantorRegularPayment);
// Payment Success
router.post("/success/:transactionId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const transactionId = req.params.transactionId;
        const order = yield model_1.default.findOneAndUpdate({ paymentTnxId: transactionId }, { $set: { paymentStatus: true } }, { new: true });
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        // Clear cart after payment success
        yield cart_model_1.default.findOneAndUpdate({ userId: order.user }, { $set: { cartItems: [] } });
        res.redirect(`${clientSideUrl}/success/${transactionId}`);
    }
    catch (error) {
        res.status(500).json({ message: "Payment success processing failed" });
    }
}));
// Payment Fail
router.post("/fail/:transactionId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const transactionId = req.params.transactionId;
        res.redirect(`${clientSideUrl}/fail/${transactionId}`);
    }
    catch (error) {
        res.status(500).json({ message: "Payment fail processing failed" });
    }
}));
// Rupantor Pay Success
router.get("/rupantor/success/:transactionId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const transactionId = req.params.transactionId;
        const { status, paymentAmount, paymentMethod } = req.query;
        if (status === "COMPLETED") {
            const verification = yield (0, shared_1.verifyRupantorPayment)(transactionId);
            if (verification.status === "COMPLETED") {
                const order = yield model_1.default.findOneAndUpdate({ paymentTnxId: transactionId }, { $set: { paymentStatus: true } }, { new: true });
                if (order) {
                    yield cart_model_1.default.findOneAndUpdate({ userId: order.user }, { $set: { cartItems: [] } });
                }
            }
        }
        res.redirect(`${clientSideUrl}/success/${transactionId}`);
    }
    catch (error) {
        res.redirect(`${clientSideUrl}/fail/${req.params.transactionId}`);
    }
}));
// Rupantor Pay Webhook
router.post("/rupantor/webhook/:transactionId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const transactionId = req.params.transactionId;
        const verification = yield (0, shared_1.verifyRupantorPayment)(transactionId);
        if (verification.status === "COMPLETED") {
            yield model_1.default.findOneAndUpdate({ paymentTnxId: transactionId }, { $set: { paymentStatus: true } });
        }
        res.status(200).json({ message: "Webhook processed" });
    }
    catch (error) {
        res.status(500).json({ message: "Webhook processing failed" });
    }
}));
exports.default = router;
