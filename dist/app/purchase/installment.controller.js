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
exports.updateInstallmentStatus = exports.getInstallmentsByPurchase = exports.getPendingInstallments = exports.getInstallmentSummary = exports.createInstallmentPayment = void 0;
const model_1 = require("./model");
const installment_model_1 = require("./installment.model");
const service_1 = require("./service");
const model_2 = require("../certificate/model");
const model_3 = require("../wallet/model");
const model_4 = require("../user/model");
const commissions_1 = require("./commissions");
const model_5 = require("../ledger/model");
const isTransactionIdUsed_1 = require("../../utils/isTransactionIdUsed");
const service_2 = require("../reward-tracker/service");
// Fix D-06: findOrCreateWallet replaced by inline findOne (wallet must exist by this point)
const getWallet = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    return yield model_3.Wallet.findOne({ userId });
});
const createInstallmentPayment = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { installmentNumbers, // new: number[] — একাধিক কিস্তি
        installmentNo, // legacy: single number (backward compat)
        amount, senderAccount, transactionId, paymentMethod, receiptImage, } = req.body;
        const purchase = yield model_1.Purchase.findById(req.params.purchaseId).populate("projectId", "installment");
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
        if (purchase.status !== "approved") {
            return res.status(400).json({
                message: "Cannot submit installment for a non-approved purchase",
            });
        }
        // ── Resolve installment numbers ──────────────────────────────────────────
        // Client can send either installmentNumbers (array) or installmentNo (legacy single).
        let resolvedNumbers = [];
        if (Array.isArray(installmentNumbers) && installmentNumbers.length > 0) {
            resolvedNumbers = installmentNumbers.map((n) => parseInt(String(n), 10));
        }
        else if (installmentNo !== undefined) {
            const single = parseInt(String(installmentNo), 10);
            if (!Number.isInteger(single) || single < 1) {
                return res.status(400).json({ message: "Invalid installment number" });
            }
            resolvedNumbers = [single];
        }
        else {
            return res.status(400).json({ message: "installmentNumbers is required" });
        }
        // Validate each installment number
        for (const n of resolvedNumbers) {
            if (!Number.isInteger(n) || n < 1) {
                return res.status(400).json({ message: `Invalid installment number: ${n}` });
            }
            if (n > ((_a = purchase.installmentCount) !== null && _a !== void 0 ? _a : 0)) {
                return res.status(400).json({
                    message: `Installment #${n} does not exist for this purchase`,
                });
            }
        }
        // Deduplicate
        const uniqueNumbers = [...new Set(resolvedNumbers)].sort((a, b) => a - b);
        const installmentCount = uniqueNumbers.length;
        const firstNo = uniqueNumbers[0];
        // Fix F-09: check transactionId uniqueness
        if (!transactionId || !String(transactionId).trim()) {
            return res.status(400).json({ message: "Transaction ID is required" });
        }
        const duplicate = yield (0, isTransactionIdUsed_1.isTransactionIdUsed)(String(transactionId).trim());
        if (duplicate) {
            return res
                .status(400)
                .json({ message: "This transaction ID has already been used" });
        }
        // Validate payment method
        const resolvedPaymentMethod = paymentMethod !== null && paymentMethod !== void 0 ? paymentMethod : "cash";
        if (!["cash", "bank", "mobile_banking"].includes(resolvedPaymentMethod)) {
            return res.status(400).json({
                message: "Invalid payment method. Must be cash, bank, or mobile_banking",
            });
        }
        // Receipt image is required for bank and mobile_banking payments
        if (["bank", "mobile_banking"].includes(resolvedPaymentMethod) &&
            !receiptImage) {
            return res.status(400).json({
                message: "Receipt image is required for bank or mobile banking payments",
            });
        }
        // Validate amount — must equal installmentCount × perInstallment
        const perInstallment = (_b = purchase.installmentAmount) !== null && _b !== void 0 ? _b : 0;
        const expectedAmount = perInstallment * installmentCount;
        const parsedAmount = Number(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ message: "Amount must be greater than 0" });
        }
        if (parsedAmount !== expectedAmount) {
            return res.status(400).json({
                message: `Amount must be ৳${expectedAmount.toLocaleString()} for ${installmentCount} installment(s) (${installmentCount} × ৳${perInstallment.toLocaleString()})`,
            });
        }
        // Check that none of the selected installments are already paid/pending
        const existingPayments = yield installment_model_1.InstallmentPayment.find({
            purchaseId: purchase._id,
            installmentNumbers: { $in: uniqueNumbers },
            status: { $in: ["approved", "pending"] },
        }).lean();
        if (existingPayments.length > 0) {
            const conflict = existingPayments.flatMap((p) => {
                var _a;
                return ((_a = p.installmentNumbers) !== null && _a !== void 0 ? _a : [p.installmentNo]).filter((n) => uniqueNumbers.includes(n));
            });
            return res.status(400).json({
                message: `Installment(s) #${[...new Set(conflict)].join(", ")} already paid or under review`,
            });
        }
        const payment = yield installment_model_1.InstallmentPayment.create({
            purchaseId: purchase._id,
            userId: req.user._id,
            installmentNumbers: uniqueNumbers,
            installmentNo: firstNo, // legacy field
            installmentCount,
            amount: parsedAmount,
            senderAccount,
            transactionId: String(transactionId).trim(),
            paymentMethod: resolvedPaymentMethod,
            receiptImage: receiptImage !== null && receiptImage !== void 0 ? receiptImage : null,
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
        const isOwner = purchase.userId.toString() === req.user._id.toString();
        const isStaff = ["superadmin", "admin", "staff"].includes(req.user.role);
        if (!isOwner && !isStaff)
            return res.status(403).json({ message: "Forbidden" });
        if (purchase.paymentType !== "installment")
            return res.status(400).json({ message: "Not an installment purchase" });
        const totalInstallments = (_a = purchase.installmentCount) !== null && _a !== void 0 ? _a : 0;
        const perInstallment = (_b = purchase.installmentAmount) !== null && _b !== void 0 ? _b : 0;
        const allPayments = yield installment_model_1.InstallmentPayment.find({
            purchaseId: purchase._id,
        })
            .sort({ installmentNo: 1, createdAt: 1 })
            .lean();
        // A grouped payment may cover several installment slots, so count slots,
        // not payment documents.
        const approvedCount = allPayments
            .filter((p) => p.status === "approved")
            .reduce((count, p) => { var _a; return count + (((_a = p.installmentNumbers) === null || _a === void 0 ? void 0 : _a.length) || 1); }, 0);
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
const getPendingInstallments = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const payments = yield installment_model_1.InstallmentPayment.find({ status: "pending" })
            .sort({ createdAt: 1 })
            .populate("userId", "name username phone")
            .populate("purchaseId", "snapshot quantity")
            .lean();
        res.json({ payments });
    }
    catch (err) {
        next(err);
    }
});
exports.getPendingInstallments = getPendingInstallments;
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
    var _a, _b, _c, _d, _e, _f, _g;
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
        // Atomically claim the pending payment.  This guarantees that a grouped
        // payment is approved/rejected only once even when two admins click at once.
        const payment = yield installment_model_1.InstallmentPayment.findOneAndUpdate({ _id: req.params.id, status: "pending" }, {
            $set: {
                status,
                reviewNote: String(reviewNote !== null && reviewNote !== void 0 ? reviewNote : "").trim(),
                reviewedBy: req.user._id,
                reviewedAt: new Date(),
            },
        }, { new: true });
        if (!payment) {
            const exists = yield installment_model_1.InstallmentPayment.exists({ _id: req.params.id });
            return res.status(exists ? 400 : 404).json({
                message: exists ? "Already reviewed" : "Installment not found",
            });
        }
        if (status === "approved") {
            // Fix F-04: use atomic $inc to avoid race condition on amountPaid
            const purchase = yield model_1.Purchase.findByIdAndUpdate(payment.purchaseId, { $inc: { amountPaid: payment.amount } }, { new: true }).populate("projectId", "cashPrice installment commissions");
            if (purchase) {
                const share = purchase.projectId;
                const projectPrice = Number((_a = share === null || share === void 0 ? void 0 : share.cashPrice) !== null && _a !== void 0 ? _a : 0);
                const totalPayable = (0, service_1.calculateTotalPayable)(projectPrice, purchase.quantity);
                const certificateStatus = (0, service_1.calculateCertificateStatus)({
                    status: purchase.status,
                    paymentType: purchase.paymentType,
                    amountPaid: purchase.amountPaid,
                    totalPayable,
                });
                yield model_2.Certificate.findOneAndUpdate({ purchaseId: purchase._id }, {
                    status: certificateStatus,
                    issuedAt: certificateStatus === "issued" ? new Date() : undefined,
                }, { upsert: true, new: true });
                // Installment commission via snapshot
                try {
                    yield (0, commissions_1.distributeInstallmentPaymentCommission)(purchase._id.toString(), payment.amount, payment.installmentNo);
                }
                catch (e) {
                    console.error("[COMMISSION ERROR] Installment commission error:", e);
                }
                // Fix E-02: Ledger — inflow for this installment payment (log failure, don't swallow)
                const buyer = yield model_4.User.findById(purchase.userId)
                    .select("name username")
                    .lean();
                const buyerName = (_b = buyer === null || buyer === void 0 ? void 0 : buyer.name) !== null && _b !== void 0 ? _b : "";
                const buyerUsername = (_c = buyer === null || buyer === void 0 ? void 0 : buyer.username) !== null && _c !== void 0 ? _c : "";
                try {
                    yield model_5.CompanyLedger.create({
                        date: new Date(),
                        type: "installment_received",
                        amount: payment.amount,
                        relatedId: payment._id,
                        relatedModel: "InstallmentPayment",
                        userId: purchase.userId,
                        note: `Installment${payment.installmentNumbers.length > 1 ? "s" : ""} #${payment.installmentNumbers.join(", #")} received — ${(_e = (_d = purchase.snapshot) === null || _d === void 0 ? void 0 : _d.shareTitle) !== null && _e !== void 0 ? _e : ""} — Buyer: ${buyerName} (@${buyerUsername}), ৳${payment.amount.toLocaleString()}`,
                    });
                }
                catch (ledgerErr) {
                    console.error(`[LEDGER ERROR] installment_received for paymentId=${payment._id}:`, ledgerErr);
                }
                yield model_3.TransactionLog.create({
                    userId: purchase.userId,
                    type: "installment_received",
                    amount: payment.amount,
                    balanceAfter: 0,
                    note: `Installment${payment.installmentNumbers.length > 1 ? "s" : ""} #${payment.installmentNumbers.join(", #")} approved — ${(_g = (_f = purchase.snapshot) === null || _f === void 0 ? void 0 : _f.shareTitle) !== null && _g !== void 0 ? _g : ""}, ৳${payment.amount.toLocaleString()}`,
                    relatedPurchaseId: purchase._id,
                }).catch((err) => {
                    console.error(`[TXLOG ERROR] installment_received log failed for paymentId=${payment._id}:`, err);
                });
                // Check and grant installment completion reward (non-critical)
                try {
                    yield (0, service_2.processRewardAfterPayment)(purchase._id.toString(), payment.amount, payment._id.toString());
                }
                catch (rewardErr) {
                    console.error(`[REWARD ERROR] processRewardAfterPayment failed for purchaseId=${purchase._id}:`, rewardErr);
                }
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
