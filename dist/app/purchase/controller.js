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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyPurchases = exports.getPurchases = exports.createPurchase = void 0;
const model_1 = require("./model");
const model_2 = require("../share/model");
const service_1 = require("./service");
const model_3 = require("../certificate/model");
// POST /purchase  — logged-in user submits a purchase request
const createPurchase = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { shareId, quantity, paymentType, senderAccount, transactionId } = req.body;
        const share = yield model_2.Share.findById(shareId);
        if (!share)
            return res.status(404).json({ message: { en: "Share not found", bn: "শেয়ার পাওয়া যায়নি" } });
        const qty = Number(quantity);
        const amountPaid = paymentType === "cash"
            ? share.cashPrice * qty
            : share.installment.downPayment * qty;
        const purchase = yield model_1.Purchase.create({
            userId: req.user._id,
            shareId,
            quantity: qty,
            paymentType,
            amountPaid,
            senderAccount,
            transactionId,
        });
        yield model_3.Certificate.create({
            userId: req.user._id,
            purchaseId: purchase._id,
            shareId,
            status: "pending",
        });
        res.status(201).json({
            message: { en: "Purchase submitted, awaiting approval", bn: "ক্রয় জমা হয়েছে, অনুমোদনের অপেক্ষায়" },
            purchase,
        });
    }
    catch (err) {
        next(err);
    }
});
exports.createPurchase = createPurchase;
// GET /purchase  — superadmin gets all purchases (populated)
const getPurchases = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const purchases = yield model_1.Purchase.find()
            .populate("userId", "name username phone")
            .populate("shareId", "title cashPrice installment")
            .sort({ createdAt: -1 })
            .lean();
        const enriched = purchases.map((purchase) => {
            var _a, _b;
            const sharePrice = Number((_b = (_a = purchase === null || purchase === void 0 ? void 0 : purchase.shareId) === null || _a === void 0 ? void 0 : _a.cashPrice) !== null && _b !== void 0 ? _b : 0);
            const totalPayable = (0, service_1.calculateTotalPayable)(sharePrice, purchase.quantity);
            return Object.assign(Object.assign({}, purchase), { totalPayable, certificateStatus: (0, service_1.calculateCertificateStatus)({
                    status: purchase.status,
                    paymentType: purchase.paymentType,
                    amountPaid: purchase.amountPaid,
                    totalPayable,
                }) });
        });
        res.json({ purchases: enriched });
    }
    catch (err) {
        next(err);
    }
});
exports.getPurchases = getPurchases;
// GET /purchase/my  — logged-in user sees their own purchases
const getMyPurchases = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const purchases = yield model_1.Purchase.find({ userId: req.user._id })
            .populate("shareId", "title cashPrice installment image")
            .sort({ createdAt: -1 })
            .lean();
        const enriched = purchases.map((purchase) => {
            var _a, _b;
            const sharePrice = Number((_b = (_a = purchase === null || purchase === void 0 ? void 0 : purchase.shareId) === null || _a === void 0 ? void 0 : _a.cashPrice) !== null && _b !== void 0 ? _b : 0);
            const totalPayable = (0, service_1.calculateTotalPayable)(sharePrice, purchase.quantity);
            return Object.assign(Object.assign({}, purchase), { totalPayable, certificateStatus: (0, service_1.calculateCertificateStatus)({
                    status: purchase.status,
                    paymentType: purchase.paymentType,
                    amountPaid: purchase.amountPaid,
                    totalPayable,
                }) });
        });
        res.json({ purchases: enriched });
    }
    catch (err) {
        next(err);
    }
});
exports.getMyPurchases = getMyPurchases;
