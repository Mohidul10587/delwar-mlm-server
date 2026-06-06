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
exports.updateInstallmentStatus = exports.getInstallmentsByPurchase = exports.getInstallmentSummary = exports.createInstallmentPayment = void 0;
const model_1 = require("./model");
const installment_model_1 = require("./installment.model");
const service_1 = require("./service");
const model_2 = require("../certificate/model");
const model_3 = require("../wallet/model");
const model_4 = require("../user/model");
const findOrCreateWallet = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    return yield model_3.Wallet.findOne({ userId });
});
const createInstallmentPayment = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { installmentNo, amount, senderAccount, transactionId } = req.body;
        const purchase = yield model_1.Purchase.findById(req.params.purchaseId).populate("shareId", "installment");
        if (!purchase) {
            return res.status(404).json({ message: { en: "Purchase not found", bn: "ক্রয় পাওয়া যায়নি" } });
        }
        if (purchase.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: { en: "Forbidden", bn: "অনুমতি নেই" } });
        }
        if (purchase.paymentType !== "installment") {
            return res.status(400).json({
                message: { en: "This purchase is not installment type", bn: "এটি কিস্তি ভিত্তিক ক্রয় নয়" },
            });
        }
        const payment = yield installment_model_1.InstallmentPayment.create({
            purchaseId: purchase._id,
            userId: req.user._id,
            installmentNo: Number(installmentNo),
            amount: Number(amount),
            senderAccount,
            transactionId,
        });
        res.status(201).json({
            message: { en: "Installment payment submitted", bn: "কিস্তির পেমেন্ট জমা হয়েছে" },
            payment,
        });
    }
    catch (err) {
        next(err);
    }
});
exports.createInstallmentPayment = createInstallmentPayment;
const getInstallmentSummary = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const purchase = yield model_1.Purchase.findById(req.params.purchaseId)
            .populate("shareId", "installment cashPrice")
            .lean();
        if (!purchase)
            return res.status(404).json({ message: { en: "Purchase not found", bn: "ক্রয় পাওয়া যায়নি" } });
        if (purchase.userId.toString() !== req.user._id.toString())
            return res.status(403).json({ message: { en: "Forbidden", bn: "অনুমতি নেই" } });
        if (purchase.paymentType !== "installment")
            return res.status(400).json({ message: { en: "Not an installment purchase", bn: "এটি কিস্তি ভিত্তিক ক্রয় নয়" } });
        const share = purchase.shareId;
        const totalInstallments = (_b = (_a = share === null || share === void 0 ? void 0 : share.installment) === null || _a === void 0 ? void 0 : _a.totalInstallments) !== null && _b !== void 0 ? _b : 0;
        const perInstallment = (_d = (_c = share === null || share === void 0 ? void 0 : share.installment) === null || _c === void 0 ? void 0 : _c.perInstallment) !== null && _d !== void 0 ? _d : 0;
        const approvedPayments = yield installment_model_1.InstallmentPayment.find({
            purchaseId: purchase._id,
            status: "approved",
        }).sort({ installmentNo: 1 }).lean();
        const completed = approvedPayments.length;
        const remaining = Math.max(0, totalInstallments - completed);
        res.json({
            totalInstallments,
            completed,
            remaining,
            perInstallment,
            amountPaid: purchase.amountPaid,
            payments: approvedPayments,
        });
    }
    catch (err) {
        next(err);
    }
});
exports.getInstallmentSummary = getInstallmentSummary;
const getInstallmentsByPurchase = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const purchase = yield model_1.Purchase.findById(req.params.purchaseId).select("userId");
        if (!purchase) {
            return res.status(404).json({ message: { en: "Purchase not found", bn: "ক্রয় পাওয়া যায়নি" } });
        }
        const isOwner = purchase.userId.toString() === req.user._id.toString();
        const isAdmin = ["superadmin", "admin", "staff"].includes(req.user.role);
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: { en: "Forbidden", bn: "অনুমতি নেই" } });
        }
        const payments = yield installment_model_1.InstallmentPayment.find({ purchaseId: purchase._id })
            .sort({ installmentNo: 1, createdAt: 1 })
            .lean();
        res.json({ payments });
    }
    catch (err) {
        next(err);
    }
});
exports.getInstallmentsByPurchase = getInstallmentsByPurchase;
const updateInstallmentStatus = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { status, reviewNote } = req.body;
        if (!["approved", "rejected"].includes(status)) {
            return res.status(400).json({ message: { en: "Invalid status", bn: "অবৈধ স্ট্যাটাস" } });
        }
        if (status === "rejected" && !String(reviewNote !== null && reviewNote !== void 0 ? reviewNote : "").trim()) {
            return res.status(400).json({
                message: { en: "Rejection reason is required", bn: "প্রত্যাখ্যানের কারণ লিখতে হবে" },
            });
        }
        const payment = yield installment_model_1.InstallmentPayment.findById(req.params.id);
        if (!payment) {
            return res.status(404).json({ message: { en: "Installment not found", bn: "কিস্তির রেকর্ড পাওয়া যায়নি" } });
        }
        if (payment.status !== "pending") {
            return res.status(400).json({ message: { en: "Already reviewed", bn: "ইতোমধ্যে রিভিউ করা হয়েছে" } });
        }
        payment.status = status;
        payment.reviewNote = String(reviewNote !== null && reviewNote !== void 0 ? reviewNote : "").trim();
        payment.reviewedBy = req.user._id;
        payment.reviewedAt = new Date();
        yield payment.save();
        if (status === "approved") {
            const purchase = yield model_1.Purchase.findById(payment.purchaseId).populate("shareId", "cashPrice installment commissions");
            if (purchase) {
                purchase.amountPaid += payment.amount;
                yield purchase.save();
                const share = purchase.shareId;
                const sharePrice = Number((_a = share === null || share === void 0 ? void 0 : share.cashPrice) !== null && _a !== void 0 ? _a : 0);
                const totalPayable = (0, service_1.calculateTotalPayable)(sharePrice, purchase.quantity);
                const certificateStatus = (0, service_1.calculateCertificateStatus)({
                    status: purchase.status,
                    paymentType: purchase.paymentType,
                    amountPaid: purchase.amountPaid,
                    totalPayable,
                });
                yield model_2.Certificate.findOneAndUpdate({ purchaseId: purchase._id }, { status: certificateStatus, issuedAt: certificateStatus === "issued" ? new Date() : undefined }, { upsert: true, new: true });
                // Installment commission to referrer
                try {
                    const buyer = yield model_4.User.findById(purchase.userId).select("generationAncestors");
                    const referrerId = (_c = (_b = buyer === null || buyer === void 0 ? void 0 : buyer.generationAncestors) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.userId;
                    if (referrerId && (share === null || share === void 0 ? void 0 : share.directSalesCommissionForInstallmentSell)) {
                        const rate = share.directSalesCommissionForInstallmentSell;
                        const commission = (rate / 100) * payment.amount;
                        if (commission > 0) {
                            const wallet = yield findOrCreateWallet(referrerId.toString());
                            if (wallet) {
                                wallet.balance += commission;
                                yield wallet.save();
                                yield model_3.TransactionLog.create({ userId: referrerId, type: "installment_commission", amount: commission, balanceAfter: wallet.balance, relatedPurchaseId: purchase._id, note: `Installment #${payment.installmentNo} commission` });
                            }
                        }
                    }
                }
                catch (e) {
                    console.error("Installment commission error:", e);
                }
            }
        }
        res.json({
            message: { en: `Installment ${status}`, bn: `কিস্তি ${status === "approved" ? "অনুমোদিত" : "প্রত্যাখ্যাত"}` },
            payment,
        });
    }
    catch (err) {
        next(err);
    }
});
exports.updateInstallmentStatus = updateInstallmentStatus;
