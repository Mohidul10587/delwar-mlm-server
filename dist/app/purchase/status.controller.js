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
exports.updatePurchaseStatus = void 0;
const model_1 = require("./model");
const service_1 = require("./service");
const model_2 = require("../certificate/model");
const commissions_1 = require("./commissions");
const updatePurchaseStatus = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { status, reviewNote } = req.body;
        if (!["approved", "rejected"].includes(status))
            return res.status(400).json({ message: { en: "Invalid status", bn: "অবৈধ স্ট্যাটাস" } });
        if (status === "rejected" && !String(reviewNote !== null && reviewNote !== void 0 ? reviewNote : "").trim())
            return res.status(400).json({ message: { en: "Rejection reason is required", bn: "প্রত্যাখ্যানের কারণ লিখতে হবে" } });
        const purchase = yield model_1.Purchase.findByIdAndUpdate(req.params.id, { status, reviewNote: String(reviewNote !== null && reviewNote !== void 0 ? reviewNote : "").trim(), reviewedBy: req.user._id, reviewedAt: new Date() }, { new: true });
        if (!purchase)
            return res.status(404).json({ message: { en: "Purchase not found", bn: "ক্রয় পাওয়া যায়নি" } });
        const purchaseWithShare = yield model_1.Purchase.findById(purchase._id).populate("shareId", "cashPrice").lean();
        if (purchaseWithShare) {
            const sharePrice = Number((_b = (_a = purchaseWithShare === null || purchaseWithShare === void 0 ? void 0 : purchaseWithShare.shareId) === null || _a === void 0 ? void 0 : _a.cashPrice) !== null && _b !== void 0 ? _b : 0);
            const totalPayable = (0, service_1.calculateTotalPayable)(sharePrice, purchaseWithShare.quantity);
            const certificateStatus = (0, service_1.calculateCertificateStatus)({
                status: purchaseWithShare.status,
                paymentType: purchaseWithShare.paymentType,
                amountPaid: purchaseWithShare.amountPaid,
                totalPayable,
            });
            yield model_2.Certificate.findOneAndUpdate({ purchaseId: purchase._id }, { status: certificateStatus, issuedAt: certificateStatus === "issued" ? new Date() : undefined }, { upsert: true, new: true });
        }
        if (status === "approved" && !purchase.commissionProcessed)
            (0, commissions_1.distributeCommissions)(purchase._id.toString());
        res.json({
            message: { en: `Purchase ${status}`, bn: `ক্রয় ${status === "approved" ? "অনুমোদিত" : "বাতিল"}` },
            purchase,
        });
    }
    catch (err) {
        next(err);
    }
});
exports.updatePurchaseStatus = updatePurchaseStatus;
