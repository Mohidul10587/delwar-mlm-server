"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.getMyPurchases = exports.getInstallmentReceipt = exports.getPurchaseReceipt = exports.getPurchaseById = exports.getPurchases = exports.createPurchase = void 0;
const model_1 = require("./model");
const installment_model_1 = require("./installment.model");
const model_2 = require("../project/model");
const model_3 = require("../user/model");
const model_4 = require("../settings/model");
const service_1 = require("./service");
const model_5 = require("../certificate/model");
const shareSlot_model_1 = require("../project/shareSlot.model");
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
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
    try {
        const { shareId, quantity, paymentType, downPayment, installmentCount, senderAccount, transactionId, buyerInfo, paymentMethod, receiptImage } = req.body;
        // Fix V-01: validate quantity
        const qty = parseInt(String(quantity), 10);
        if (!Number.isInteger(qty) || qty < 1) {
            return res.status(400).json({ message: "Quantity must be a positive integer" });
        }
        // Fix F-10: check transactionId uniqueness before creating purchase
        if (!transactionId || !String(transactionId).trim()) {
            return res.status(400).json({ message: "Transaction ID is required" });
        }
        const { isTransactionIdUsed } = yield Promise.resolve().then(() => __importStar(require("../../utils/isTransactionIdUsed")));
        const duplicate = yield isTransactionIdUsed(String(transactionId).trim());
        if (duplicate) {
            return res.status(400).json({ message: "This transaction ID has already been used" });
        }
        // Validate payment method
        const resolvedPaymentMethod = paymentMethod !== null && paymentMethod !== void 0 ? paymentMethod : "cash";
        if (!["cash", "bank", "mobile_banking"].includes(resolvedPaymentMethod)) {
            return res.status(400).json({ message: "Invalid payment method. Must be cash, bank, or mobile_banking" });
        }
        // Receipt image is required for bank and mobile_banking payments
        if (["bank", "mobile_banking"].includes(resolvedPaymentMethod) && !receiptImage) {
            return res.status(400).json({ message: "Receipt image is required for bank or mobile banking payments" });
        }
        if (!["cash", "installment"].includes(paymentType)) {
            return res.status(400).json({ message: "Invalid payment type" });
        }
        const share = yield model_2.Project.findById(shareId);
        if (!share)
            return res.status(404).json({ message: "Share not found" });
        if (!share.isActive)
            return res.status(400).json({ message: "This share is not available for purchase" });
        // Fix F-11: validate down payment range for installment
        if (paymentType === "installment") {
            const dp = Number(downPayment);
            if (isNaN(dp) || dp < share.minDownPayment || dp > share.maxDownPayment) {
                return res.status(400).json({
                    message: `Down payment per unit must be between ৳${share.minDownPayment.toLocaleString()} and ৳${share.maxDownPayment.toLocaleString()}`,
                });
            }
            // Fix F-14: validate installment count range
            const ic = parseInt(String(installmentCount), 10);
            if (!Number.isInteger(ic) || ic < share.minInstallments || ic > share.maxInstallments) {
                return res.status(400).json({
                    message: `Installment count must be between ${share.minInstallments} and ${share.maxInstallments}`,
                });
            }
        }
        const buyer = yield model_3.User.findById(req.user._id).select("name phone nominee nominee2");
        // Build resolvedBuyerInfo:
        // - If frontend sends buyerInfo.nominees array → use it (new behaviour)
        // - If frontend sends legacy buyerInfo.nominee/nominee2 → normalise into nominees array
        // - If no buyerInfo sent → fall back to user's stored nominees
        let resolvedBuyerInfo = null;
        if (buyerInfo) {
            const incomingNominees = [];
            if (Array.isArray(buyerInfo.nominees) && buyerInfo.nominees.length > 0) {
                // New path: nominees array provided
                for (const n of buyerInfo.nominees) {
                    if (n && typeof n === "object") {
                        incomingNominees.push({
                            name: String((_a = n.name) !== null && _a !== void 0 ? _a : "").trim(),
                            relation: String((_b = n.relation) !== null && _b !== void 0 ? _b : "").trim(),
                            phone: String((_c = n.phone) !== null && _c !== void 0 ? _c : "").trim(),
                            nid: n.nid ? String(n.nid).trim() : undefined,
                            image: n.image ? String(n.image).trim() : undefined,
                        });
                    }
                }
            }
            else {
                // Legacy path: nominee / nominee2 fixed fields
                if ((_d = buyerInfo.nominee) === null || _d === void 0 ? void 0 : _d.name)
                    incomingNominees.push(buyerInfo.nominee);
                if ((_e = buyerInfo.nominee2) === null || _e === void 0 ? void 0 : _e.name)
                    incomingNominees.push(buyerInfo.nominee2);
            }
            resolvedBuyerInfo = {
                name: (_f = buyerInfo.name) !== null && _f !== void 0 ? _f : buyer === null || buyer === void 0 ? void 0 : buyer.name,
                phone: (_g = buyerInfo.phone) !== null && _g !== void 0 ? _g : buyer === null || buyer === void 0 ? void 0 : buyer.phone,
                nominees: incomingNominees.length ? incomingNominees : undefined,
                // Keep legacy fields as well for backward compat with older receipt renders
                nominee: (_h = incomingNominees[0]) !== null && _h !== void 0 ? _h : undefined,
                nominee2: (_j = incomingNominees[1]) !== null && _j !== void 0 ? _j : undefined,
            };
        }
        else if (buyer) {
            // Fall back to user's stored nominees
            const fallbackNominees = [];
            if ((_k = buyer.nominee) === null || _k === void 0 ? void 0 : _k.name)
                fallbackNominees.push(buyer.nominee);
            if ((_l = buyer.nominee2) === null || _l === void 0 ? void 0 : _l.name)
                fallbackNominees.push(buyer.nominee2);
            resolvedBuyerInfo = {
                name: buyer.name,
                phone: buyer.phone,
                nominees: fallbackNominees.length ? fallbackNominees : undefined,
                nominee: (_m = buyer.nominee) !== null && _m !== void 0 ? _m : undefined,
                nominee2: (_o = buyer.nominee2) !== null && _o !== void 0 ? _o : undefined,
            };
        }
        const totalPayable = share.cashPrice * qty;
        const resolvedDP = paymentType === "cash" ? share.maxDownPayment * qty : Number(downPayment) * qty;
        const resolvedCount = paymentType === "cash" ? 1 : Number(installmentCount);
        const resolvedInstallmentAmount = Math.ceil((totalPayable - resolvedDP) / resolvedCount);
        const amountPaid = resolvedDP;
        const settings = yield model_4.Settings.findOne().lean();
        const ranks = ((_p = settings === null || settings === void 0 ? void 0 : settings.ranks) !== null && _p !== void 0 ? _p : []);
        const snapshot = {
            shareTitle: share.title,
            shareImage: (_r = (_q = share.images) === null || _q === void 0 ? void 0 : _q[0]) !== null && _r !== void 0 ? _r : "",
            cashPrice: share.cashPrice,
            minDownPayment: share.minDownPayment,
            maxDownPayment: share.maxDownPayment,
            directSaleCommissionValue: share.directSaleCommissionValue,
            downPaymentGenerationRates: share.downPaymentGenerationRates,
            installmentCommissionRate: share.installmentCommissionRate,
            installmentGenerationRates: (_s = share.installmentGenerationRates) !== null && _s !== void 0 ? _s : [],
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
            paymentMethod: resolvedPaymentMethod,
            receiptImage: receiptImage !== null && receiptImage !== void 0 ? receiptImage : null,
            downPayment: resolvedDP,
            installmentCount: resolvedCount,
            installmentAmount: resolvedInstallmentAmount,
            amountPaid,
            senderAccount,
            transactionId: String(transactionId).trim(),
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
// GET /purchase  — superadmin gets all purchases (populated, paginated)
const getPurchases = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // H-05 fix: pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 30;
        const skip = (page - 1) * limit;
        const filter = {};
        if (req.query.status)
            filter.status = req.query.status;
        const [purchases, total] = yield Promise.all([
            model_1.Purchase.find(filter)
                .populate("userId", "name username phone")
                .populate("shareId", "title cashPrice installment")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            model_1.Purchase.countDocuments(filter),
        ]);
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
        res.json({ purchases: enriched, total, page, pages: Math.ceil(total / limit) });
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
// GET /purchase/:id/receipt  — logged-in user (or staff) gets receipt for an approved purchase
const getPurchaseReceipt = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    try {
        const purchase = yield model_1.Purchase.findById(req.params.id)
            .populate("userId", "name username phone")
            .populate("shareId", "title cashPrice image")
            .populate("reviewedBy", "name username") // cashier / receiver
            .lean();
        if (!purchase)
            return res.status(404).json({ message: "Purchase not found" });
        // Only the owner or staff can access
        const isOwner = purchase.userId && ((_a = purchase.userId._id) === null || _a === void 0 ? void 0 : _a.toString()) === req.user._id.toString();
        const isStaff = ["superadmin", "admin", "staff"].includes(req.user.role);
        if (!isOwner && !isStaff)
            return res.status(403).json({ message: "Forbidden" });
        if (purchase.status !== "approved")
            return res.status(400).json({ message: "Receipt only available for approved purchases" });
        // Fetch share slot numbers
        const slots = yield shareSlot_model_1.ShareSlot.find({ purchaseId: purchase._id, status: "sold" })
            .select("shareNumber")
            .sort({ shareNumber: 1 })
            .lean();
        // Fetch company settings for receipt header
        const settings = yield model_4.Settings.findOne()
            .select("siteTitle logo contactPhone contactEmail contactAddress")
            .lean();
        res.json({
            purchase,
            shareNumbers: slots.map((s) => s.shareNumber),
            company: {
                siteTitle: (_b = settings === null || settings === void 0 ? void 0 : settings.siteTitle) !== null && _b !== void 0 ? _b : "",
                logo: (_c = settings === null || settings === void 0 ? void 0 : settings.logo) !== null && _c !== void 0 ? _c : "",
                contactPhone: (_d = settings === null || settings === void 0 ? void 0 : settings.contactPhone) !== null && _d !== void 0 ? _d : "",
                contactEmail: (_e = settings === null || settings === void 0 ? void 0 : settings.contactEmail) !== null && _e !== void 0 ? _e : "",
                contactAddress: (_f = settings === null || settings === void 0 ? void 0 : settings.contactAddress) !== null && _f !== void 0 ? _f : "",
            },
        });
    }
    catch (err) {
        next(err);
    }
});
exports.getPurchaseReceipt = getPurchaseReceipt;
// GET /purchase/:purchaseId/installments/:installmentId/receipt
const getInstallmentReceipt = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    try {
        const { purchaseId, installmentId } = req.params;
        const purchase = yield model_1.Purchase.findById(purchaseId)
            .populate("userId", "name username phone")
            .populate("shareId", "title cashPrice image")
            .lean();
        if (!purchase)
            return res.status(404).json({ message: "Purchase not found" });
        const isOwner = purchase.userId && ((_a = purchase.userId._id) === null || _a === void 0 ? void 0 : _a.toString()) === req.user._id.toString();
        const isStaff = ["superadmin", "admin", "staff"].includes(req.user.role);
        if (!isOwner && !isStaff)
            return res.status(403).json({ message: "Forbidden" });
        const installment = yield installment_model_1.InstallmentPayment.findById(installmentId)
            .populate("reviewedBy", "name username") // cashier / receiver
            .lean();
        if (!installment)
            return res.status(404).json({ message: "Installment not found" });
        if (installment.status !== "approved")
            return res.status(400).json({ message: "Receipt only available for approved installments" });
        const settings = yield model_4.Settings.findOne()
            .select("siteTitle logo contactPhone contactEmail contactAddress")
            .lean();
        res.json({
            purchase,
            installment,
            company: {
                siteTitle: (_b = settings === null || settings === void 0 ? void 0 : settings.siteTitle) !== null && _b !== void 0 ? _b : "",
                logo: (_c = settings === null || settings === void 0 ? void 0 : settings.logo) !== null && _c !== void 0 ? _c : "",
                contactPhone: (_d = settings === null || settings === void 0 ? void 0 : settings.contactPhone) !== null && _d !== void 0 ? _d : "",
                contactEmail: (_e = settings === null || settings === void 0 ? void 0 : settings.contactEmail) !== null && _e !== void 0 ? _e : "",
                contactAddress: (_f = settings === null || settings === void 0 ? void 0 : settings.contactAddress) !== null && _f !== void 0 ? _f : "",
            },
        });
    }
    catch (err) {
        next(err);
    }
});
exports.getInstallmentReceipt = getInstallmentReceipt;
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
