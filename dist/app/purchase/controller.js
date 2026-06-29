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
exports.getMyPurchases = exports.getPurchaseById = exports.getPurchases = exports.createPurchase = void 0;
const model_1 = require("./model");
const installment_model_1 = require("./installment.model");
const model_2 = require("../share/model");
const model_3 = require("../user/model");
const model_4 = require("../settings/model");
const service_1 = require("./service");
const model_5 = require("../certificate/model");
const shareSlot_model_1 = require("../share/shareSlot.model");
// Helper — build slotsByPurchase map from a list of purchaseIds
function fetchSlotsByPurchase(purchaseIds) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (!purchaseIds.length)
            return {};
        const slots = yield shareSlot_model_1.ShareSlot.find({
            purchaseId: { $in: purchaseIds },
            status: "sold",
        })
            .select("purchaseId shareNumber")
            .sort({ shareNumber: 1 })
            .lean();
        const map = {};
        for (const s of slots) {
            const key = s.purchaseId.toString();
            ((_a = map[key]) !== null && _a !== void 0 ? _a : (map[key] = [])).push(s.shareNumber);
        }
        return map;
    });
}
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
        const resolvedDP = paymentType === "cash" ? share.maxDownPayment * qty : Number(downPayment) * qty;
        const resolvedCount = paymentType === "cash" ? 1 : Number(installmentCount);
        const resolvedInstallmentAmount = Math.ceil((totalPayable - resolvedDP) / resolvedCount);
        const amountPaid = resolvedDP;
        const settings = yield model_4.Settings.findOne().lean();
        const ranks = ((_c = settings === null || settings === void 0 ? void 0 : settings.ranks) !== null && _c !== void 0 ? _c : []);
        const snapshot = {
            shareTitle: share.title,
            shareImage: share.image,
            cashPrice: share.cashPrice,
            minDownPayment: share.minDownPayment,
            maxDownPayment: share.maxDownPayment,
            directSaleCommissionValue: share.directSaleCommissionValue,
            downPaymentGenerationRates: share.downPaymentGenerationRates,
            installmentCommissionRate: share.installmentCommissionRate,
            rankQualification: ranks.map((r) => {
                var _a;
                return ({
                    rankName: r.name,
                    order: r.order,
                    requiredApprovedSales: (_a = r.requiredApprovedSales) !== null && _a !== void 0 ? _a : 0,
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
    var _a;
    try {
        const purchases = yield model_1.Purchase.find()
            .populate("userId", "name username phone")
            .populate("shareId", "title cashPrice installment")
            .sort({ createdAt: -1 })
            .lean();
        const installmentPurchaseIds = purchases
            .filter((p) => p.paymentType === "installment" && p.status !== "pending")
            .map((p) => p._id);
        const allPayments = installmentPurchaseIds.length
            ? yield installment_model_1.InstallmentPayment.find({ purchaseId: { $in: installmentPurchaseIds } }).lean()
            : [];
        const paymentsByPurchase = {};
        for (const pay of allPayments) {
            const key = pay.purchaseId.toString();
            ((_a = paymentsByPurchase[key]) !== null && _a !== void 0 ? _a : (paymentsByPurchase[key] = [])).push(pay);
        }
        // Fetch share slots for approved purchases
        const approvedIds = purchases
            .filter((p) => p.status === "approved")
            .map((p) => p._id);
        const slotsByPurchase = yield fetchSlotsByPurchase(approvedIds);
        const enriched = purchases.map((purchase) => {
            var _a, _b, _c, _d, _e, _f;
            const sharePrice = Number((_b = (_a = purchase === null || purchase === void 0 ? void 0 : purchase.shareId) === null || _a === void 0 ? void 0 : _a.cashPrice) !== null && _b !== void 0 ? _b : 0);
            const totalPayable = (0, service_1.calculateTotalPayable)(sharePrice, purchase.quantity);
            const base = Object.assign(Object.assign({}, purchase), { totalPayable, shareNumbers: (_c = slotsByPurchase[purchase._id.toString()]) !== null && _c !== void 0 ? _c : [], certificateStatus: (0, service_1.calculateCertificateStatus)({
                    status: purchase.status,
                    paymentType: purchase.paymentType,
                    amountPaid: purchase.amountPaid,
                    totalPayable,
                }) });
            if (purchase.paymentType !== "installment" || purchase.status === "pending")
                return base;
            const payments = (_d = paymentsByPurchase[purchase._id.toString()]) !== null && _d !== void 0 ? _d : [];
            const perInstallment = (_e = purchase.installmentAmount) !== null && _e !== void 0 ? _e : 0;
            const totalInstallments = (_f = purchase.installmentCount) !== null && _f !== void 0 ? _f : 0;
            const completed = payments.filter((p) => p.status === "approved").length;
            const amountRemaining = Math.max(0, totalPayable - purchase.amountPaid);
            return Object.assign(Object.assign({}, base), { installmentSummary: {
                    totalInstallments,
                    completed,
                    remaining: Math.max(0, totalInstallments - completed),
                    perInstallment,
                    amountPaid: purchase.amountPaid,
                    amountRemaining,
                    payments,
                } });
        });
        res.json({ purchases: enriched });
    }
    catch (err) {
        next(err);
    }
});
exports.getPurchases = getPurchases;
// GET /purchase/:id  — staff gets a single purchase by id
const getPurchaseById = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const purchase = yield model_1.Purchase.findById(req.params.id)
            .populate("userId", "name username phone")
            .populate("shareId", "title cashPrice installment")
            .lean();
        if (!purchase)
            return res.status(404).json({ message: "Purchase not found" });
        const sharePrice = Number((_b = (_a = purchase === null || purchase === void 0 ? void 0 : purchase.shareId) === null || _a === void 0 ? void 0 : _a.cashPrice) !== null && _b !== void 0 ? _b : 0);
        const totalPayable = (0, service_1.calculateTotalPayable)(sharePrice, purchase.quantity);
        const slots = yield shareSlot_model_1.ShareSlot.find({ purchaseId: purchase._id, status: "sold" })
            .select("shareNumber")
            .sort({ shareNumber: 1 })
            .lean();
        res.json({
            purchase: Object.assign(Object.assign({}, purchase), { totalPayable, shareNumbers: slots.map((s) => s.shareNumber), certificateStatus: (0, service_1.calculateCertificateStatus)({
                    status: purchase.status,
                    paymentType: purchase.paymentType,
                    amountPaid: purchase.amountPaid,
                    totalPayable,
                }) }),
        });
    }
    catch (err) {
        next(err);
    }
});
exports.getPurchaseById = getPurchaseById;
// GET /purchase/my  — logged-in user sees their own purchases
const getMyPurchases = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const purchases = yield model_1.Purchase.find({ userId: req.user._id })
            .populate("shareId", "title cashPrice installment image")
            .sort({ createdAt: -1 })
            .lean();
        const approvedIds = purchases
            .filter((p) => p.status === "approved")
            .map((p) => p._id);
        const slotsByPurchase = yield fetchSlotsByPurchase(approvedIds);
        const enriched = purchases.map((purchase) => {
            var _a, _b, _c;
            const sharePrice = Number((_b = (_a = purchase === null || purchase === void 0 ? void 0 : purchase.shareId) === null || _a === void 0 ? void 0 : _a.cashPrice) !== null && _b !== void 0 ? _b : 0);
            const totalPayable = (0, service_1.calculateTotalPayable)(sharePrice, purchase.quantity);
            return Object.assign(Object.assign({}, purchase), { totalPayable, shareNumbers: (_c = slotsByPurchase[purchase._id.toString()]) !== null && _c !== void 0 ? _c : [], certificateStatus: (0, service_1.calculateCertificateStatus)({
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
