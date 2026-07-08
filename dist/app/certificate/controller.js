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
exports.downloadCertificate = exports.getMyCertificates = void 0;
const model_1 = require("./model");
const service_1 = require("../purchase/service");
const shareSlot_model_1 = require("../project/shareSlot.model");
const generateCertificate_1 = require("./generateCertificate");
// GET /certificate/my — logged-in user's own certificates with share & purchase info
const getMyCertificates = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const certificates = yield model_1.Certificate.find({ userId: req.user._id })
            .populate("projectId", "title image cashPrice")
            .populate("purchaseId", "paymentType amountPaid quantity status transactionId createdAt buyerInfo downPayment installmentCount installmentAmount snapshot")
            .populate("userId", "name phone nominee dateOfBirth district upazila")
            .sort({ createdAt: -1 })
            .lean();
        // Fetch share slots for all purchases in one query
        const purchaseIds = certificates.map((c) => { var _a; return (_a = c.purchaseId) === null || _a === void 0 ? void 0 : _a._id; }).filter(Boolean);
        const slots = purchaseIds.length
            ? yield shareSlot_model_1.ShareSlot.find({ purchaseId: { $in: purchaseIds }, status: "sold" })
                .select("purchaseId shareNumber")
                .sort({ shareNumber: 1 })
                .lean()
            : [];
        const slotsByPurchase = {};
        for (const s of slots) {
            const key = s.purchaseId.toString();
            ((_a = slotsByPurchase[key]) !== null && _a !== void 0 ? _a : (slotsByPurchase[key] = [])).push(s.shareNumber);
        }
        const enriched = certificates.map((c) => {
            var _a, _b, _c, _d;
            const share = c.projectId;
            const purchase = c.purchaseId;
            const totalPayable = (share === null || share === void 0 ? void 0 : share.cashPrice)
                ? (0, service_1.calculateTotalPayable)(Number(share.cashPrice), (_a = purchase === null || purchase === void 0 ? void 0 : purchase.quantity) !== null && _a !== void 0 ? _a : 1)
                : 0;
            const amountPaid = (_b = purchase === null || purchase === void 0 ? void 0 : purchase.amountPaid) !== null && _b !== void 0 ? _b : 0;
            return Object.assign(Object.assign({}, c), { totalPayable, amountRemaining: Math.max(0, totalPayable - amountPaid), shareNumbers: (_d = slotsByPurchase[(_c = purchase === null || purchase === void 0 ? void 0 : purchase._id) === null || _c === void 0 ? void 0 : _c.toString()]) !== null && _d !== void 0 ? _d : [] });
        });
        res.json({ certificates: enriched });
    }
    catch (err) {
        next(err);
    }
});
exports.getMyCertificates = getMyCertificates;
// GET /certificate/:id/download — server-side PNG generation
const downloadCertificate = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const cert = yield model_1.Certificate.findOne({ _id: req.params.id, userId: req.user._id })
            .populate("projectId", "title image cashPrice")
            .populate("purchaseId", "paymentType amountPaid quantity status transactionId createdAt buyerInfo downPayment installmentCount installmentAmount snapshot")
            .populate("userId", "name phone nominee dateOfBirth district upazila")
            .lean();
        if (!cert)
            return res.status(404).json({ message: "Certificate not found" });
        if (cert.status !== "issued")
            return res.status(403).json({ message: "Certificate not yet issued" });
        const share = cert.projectId;
        const purchase = cert.purchaseId;
        const totalPayable = (share === null || share === void 0 ? void 0 : share.cashPrice)
            ? (0, service_1.calculateTotalPayable)(Number(share.cashPrice), (_a = purchase === null || purchase === void 0 ? void 0 : purchase.quantity) !== null && _a !== void 0 ? _a : 1)
            : 0;
        const amountPaid = (_b = purchase === null || purchase === void 0 ? void 0 : purchase.amountPaid) !== null && _b !== void 0 ? _b : 0;
        const slots = yield shareSlot_model_1.ShareSlot.find({ purchaseId: purchase === null || purchase === void 0 ? void 0 : purchase._id, status: "sold" })
            .select("shareNumber")
            .sort({ shareNumber: 1 })
            .lean();
        const certData = Object.assign(Object.assign({}, cert), { totalPayable, amountRemaining: Math.max(0, totalPayable - amountPaid), shareNumbers: slots.map((s) => s.shareNumber) });
        const pngBuffer = yield (0, generateCertificate_1.generateCertificatePng)(certData);
        res.set({
            "Content-Type": "image/png",
            "Content-Disposition": `attachment; filename="certificate-${cert._id}.png"`,
            "Content-Length": pngBuffer.length,
            "Cache-Control": "no-store",
        });
        res.send(pngBuffer);
    }
    catch (err) {
        next(err);
    }
});
exports.downloadCertificate = downloadCertificate;
