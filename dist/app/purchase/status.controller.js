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
const model_3 = require("../user/model");
const model_4 = require("../ledger/model");
const updatePurchaseStatus = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    try {
        const { status, reviewNote } = req.body;
        if (!["approved", "rejected"].includes(status))
            return res.status(400).json({ message: "Invalid status" });
        if (status === "rejected" && !String(reviewNote !== null && reviewNote !== void 0 ? reviewNote : "").trim())
            return res.status(400).json({ message: "Rejection reason is required" });
        const purchase = yield model_1.Purchase.findByIdAndUpdate(req.params.id, {
            status,
            reviewNote: String(reviewNote !== null && reviewNote !== void 0 ? reviewNote : "").trim(),
            reviewedBy: req.user._id,
            reviewedAt: new Date(),
        }, { new: true });
        if (!purchase) {
            return res.status(404).json({ message: "Purchase not found" });
        }
        if (status === "approved" && !purchase.commissionProcessed) {
            // For cash: mark full amount as paid (downPayment + remainder)
            if (purchase.paymentType === "cash") {
                const fullAmount = purchase.snapshot.cashPrice * purchase.quantity;
                if (fullAmount > purchase.amountPaid) {
                    purchase.amountPaid = fullAmount;
                    yield purchase.save();
                }
            }
            (0, commissions_1.distributeCommissions)(purchase._id.toString());
            yield model_3.User.findByIdAndUpdate(purchase.userId, {
                $inc: { personalSharesCount: purchase.quantity },
            });
            // Ledger: record inflow for this purchase approval
            const buyer = yield model_3.User.findById(purchase.userId).select("name username").lean();
            const buyerName = (_a = buyer === null || buyer === void 0 ? void 0 : buyer.name) !== null && _a !== void 0 ? _a : "";
            const buyerUsername = (_b = buyer === null || buyer === void 0 ? void 0 : buyer.username) !== null && _b !== void 0 ? _b : "";
            yield model_4.CompanyLedger.create({
                date: new Date(),
                type: "purchase_received",
                amount: purchase.amountPaid,
                relatedId: purchase._id,
                relatedModel: "Purchase",
                userId: purchase.userId,
                note: `Purchase approved — ${(_d = (_c = purchase.snapshot) === null || _c === void 0 ? void 0 : _c.shareTitle) !== null && _d !== void 0 ? _d : ""} x${purchase.quantity} [${purchase.paymentType}] — Buyer: ${buyerName} (@${buyerUsername}), ৳${purchase.amountPaid.toLocaleString()}`,
            }).catch(() => { });
        }
        const purchaseWithShare = yield model_1.Purchase.findById(purchase._id)
            .populate("shareId", "cashPrice")
            .lean();
        if (purchaseWithShare) {
            const sharePrice = Number((_f = (_e = purchaseWithShare === null || purchaseWithShare === void 0 ? void 0 : purchaseWithShare.shareId) === null || _e === void 0 ? void 0 : _e.cashPrice) !== null && _f !== void 0 ? _f : 0);
            const totalPayable = (0, service_1.calculateTotalPayable)(sharePrice, purchaseWithShare.quantity);
            const certificateStatus = (0, service_1.calculateCertificateStatus)({
                status: purchaseWithShare.status,
                paymentType: purchaseWithShare.paymentType,
                amountPaid: purchaseWithShare.amountPaid,
                totalPayable,
            });
            yield model_2.Certificate.findOneAndUpdate({ purchaseId: purchase._id }, {
                status: certificateStatus,
                issuedAt: certificateStatus === "issued" ? new Date() : undefined,
            }, { upsert: true, new: true });
        }
        res.json({ message: `Purchase ${status}`, purchase });
    }
    catch (err) {
        next(err);
    }
});
exports.updatePurchaseStatus = updatePurchaseStatus;
