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
const model_3 = require("../user/model");
const model_4 = require("../settings/model");
const service_1 = require("./service");
const model_5 = require("../certificate/model");
// POST /purchase  — logged-in user submits a purchase request
const createPurchase = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { shareId, quantity, paymentType, downPayment, installmentCount, senderAccount, transactionId, buyerInfo } = req.body;
        const share = yield model_2.Share.findById(shareId);
        if (!share)
            return res.status(404).json({ message: "Share not found" });
        const buyer = yield model_3.User.findById(req.user._id).select("name phone nominee nominee2");
        const resolvedBuyerInfo = buyerInfo !== null && buyerInfo !== void 0 ? buyerInfo : (buyer ? {
            name: buyer.name,
            phone: buyer.phone,
            nominee: (_a = buyer.nominee) !== null && _a !== void 0 ? _a : undefined,
            nominee2: (_b = buyer.nominee2) !== null && _b !== void 0 ? _b : undefined,
        } : null);
        const qty = Number(quantity);
        const totalPayable = share.cashPrice * qty;
        // Cash: fixed DP = cashDownPaymentLimit, 1 installment for remainder
        // Installment: user-provided DP and installmentCount
        const resolvedDP = paymentType === "cash" ? share.cashDownPaymentLimit * qty : Number(downPayment) * qty;
        const resolvedCount = paymentType === "cash" ? 1 : Number(installmentCount);
        const resolvedInstallmentAmount = Math.ceil((totalPayable - resolvedDP) / resolvedCount);
        const amountPaid = resolvedDP;
        // Build snapshot — locks all commission/config + rank/salary rules at time of purchase
        const settings = yield model_4.Settings.findOne().lean();
        const ranks = ((_c = settings === null || settings === void 0 ? void 0 : settings.ranks) !== null && _c !== void 0 ? _c : []);
        const snapshot = {
            shareTitle: share.title,
            shareImage: share.image,
            cashPrice: share.cashPrice,
            cashDownPaymentLimit: share.cashDownPaymentLimit,
            directSaleCommissionValue: share.directSaleCommissionValue,
            downPaymentGenerationRates: share.downPaymentGenerationRates,
            installmentCommissionRate: share.installmentCommissionRate,
            rankQualification: ranks.map((r) => {
                var _a, _b;
                return ({
                    rankName: r.name,
                    order: r.order,
                    requiredGeneration: (_a = r.requiredGeneration) !== null && _a !== void 0 ? _a : 1,
                    requiredApprovedSales: (_b = r.requiredApprovedSales) !== null && _b !== void 0 ? _b : 0,
                });
            }),
            salaryRules: ranks
                .filter((r) => { var _a; return ((_a = r.salary) === null || _a === void 0 ? void 0 : _a.amount) > 0; })
                .map((r) => ({
                rankName: r.name,
                amount: r.salary.amount,
                durationMonths: r.salary.durationMonths,
                minMonthlySales: r.salary.minMonthlySales,
                requiredPersonalShares: r.salary.requiredPersonalShares,
                requiredPersonalPurchaseAmount: r.salary.requiredPersonalPurchaseAmount,
            })),
        };
        const purchase = yield model_1.Purchase.create({
            userId: req.user._id,
            shareId,
            quantity: qty,
            paymentType,
            downPayment: resolvedDP,
            installmentCount: resolvedCount,
            installmentAmount: resolvedInstallmentAmount,
            amountPaid,
            senderAccount,
            transactionId,
            buyerInfo: resolvedBuyerInfo,
            snapshot,
        });
        yield model_5.Certificate.create({
            userId: req.user._id,
            purchaseId: purchase._id,
            shareId,
            status: "pending",
        });
        res.status(201).json({
            message: "Purchase submitted, awaiting approval",
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
