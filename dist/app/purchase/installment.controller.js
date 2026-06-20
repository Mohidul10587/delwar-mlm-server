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
const commissions_1 = require("./commissions");
const model_4 = require("../ledger/model");
const findOrCreateWallet = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    return yield model_3.Wallet.findOne({ userId });
});
const createInstallmentPayment = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { installmentNo, amount, senderAccount, transactionId } = req.body;
        const purchase = yield model_1.Purchase.findById(req.params.purchaseId).populate("shareId", "installment");
        if (!purchase) {
            return res.status(404).json({ message: "Purchase not found" });
        }
        if (purchase.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Forbidden" });
        }
        if (purchase.paymentType !== "installment") {
            return res.status(400).json({
                message: "This purchase is not installment type",
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
            message: "Installment payment submitted",
            payment,
        });
    }
    catch (err) {
        next(err);
    }
});
exports.createInstallmentPayment = createInstallmentPayment;
const getInstallmentSummary = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const purchase = yield model_1.Purchase.findById(req.params.purchaseId).lean();
        if (!purchase)
            return res.status(404).json({ message: "Purchase not found" });
        if (purchase.userId.toString() !== req.user._id.toString())
            return res.status(403).json({ message: "Forbidden" });
        if (purchase.paymentType !== "installment")
            return res.status(400).json({ message: "Not an installment purchase" });
        const totalInstallments = (_a = purchase.installmentCount) !== null && _a !== void 0 ? _a : 0;
        const perInstallment = (_b = purchase.installmentAmount) !== null && _b !== void 0 ? _b : 0;
        const allPayments = yield installment_model_1.InstallmentPayment.find({ purchaseId: purchase._id })
            .sort({ installmentNo: 1, createdAt: 1 }).lean();
        const approvedCount = allPayments.filter((p) => p.status === "approved").length;
        const totalPayable = ((_c = purchase.downPayment) !== null && _c !== void 0 ? _c : 0) + totalInstallments * perInstallment;
        const amountRemaining = Math.max(0, totalPayable - purchase.amountPaid);
        res.json({
            totalInstallments,
            completed: approvedCount,
            remaining: Math.max(0, totalInstallments - approvedCount),
            perInstallment,
            amountPaid: purchase.amountPaid,
            amountRemaining,
            payments: allPayments,
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
            return res.status(404).json({ message: "Purchase not found" });
        }
        const isOwner = purchase.userId.toString() === req.user._id.toString();
        const isAdmin = ["superadmin", "admin", "staff"].includes(req.user.role);
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: "Forbidden" });
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
    var _a;
    try {
        const { status, reviewNote } = req.body;
        if (!["approved", "rejected"].includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }
        if (status === "rejected" && !String(reviewNote !== null && reviewNote !== void 0 ? reviewNote : "").trim()) {
            return res.status(400).json({
                message: "Rejection reason is required",
            });
        }
        const payment = yield installment_model_1.InstallmentPayment.findById(req.params.id);
        if (!payment) {
            return res.status(404).json({ message: "Installment not found" });
        }
        if (payment.status !== "pending") {
            return res.status(400).json({ message: "Already reviewed" });
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
                // Installment commission via snapshot
                try {
                    yield (0, commissions_1.distributeInstallmentPaymentCommission)(purchase._id.toString(), payment.amount);
                }
                catch (e) {
                    console.error("Installment commission error:", e);
                }
                // Ledger: inflow for this installment payment
                yield model_4.CompanyLedger.create({
                    date: new Date(),
                    type: "installment_received",
                    amount: payment.amount,
                    relatedId: payment._id,
                    relatedModel: "InstallmentPayment",
                    userId: purchase.userId,
                    note: `Installment #${payment.installmentNo} approved — purchase ${purchase._id}`,
                }).catch(() => { });
            }
        }
        res.json({
            message: `Installment ${status}`,
            payment,
        });
    }
    catch (err) {
        next(err);
    }
});
exports.updateInstallmentStatus = updateInstallmentStatus;
