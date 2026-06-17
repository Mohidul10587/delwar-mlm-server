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
            return res.status(400).json({ message: "Invalid status" });
        if (status === "rejected" && !String(reviewNote !== null && reviewNote !== void 0 ? reviewNote : "").trim())
            return res.status(400).json({ message: "Rejection reason is required" });
        const purchase = yield model_1.Purchase.findByIdAndUpdate(req.params.id, { status, reviewNote: String(reviewNote !== null && reviewNote !== void 0 ? reviewNote : "").trim(), reviewedBy: req.user._id, reviewedAt: new Date() }, { new: true });
        if (!purchase)
            return res.status(404).json({ message: "Purchase not found" });
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
        if (status === "approved" && !purchase.commissionProcessed) {
            (0, commissions_1.distributeCommissions)(purchase._id.toString());
            // Update buyer's personal purchase stats
            yield (yield Promise.resolve().then(() => __importStar(require("../user/model")))).User.findByIdAndUpdate(purchase.userId, {
                $inc: {
                    personalSharesCount: purchase.quantity,
                    totalPersonalPurchaseAmount: purchase.amountPaid,
                },
            });
        }
        res.json({
            message: `Purchase ${status}`,
            purchase,
        });
    }
    catch (err) {
        next(err);
    }
});
exports.updatePurchaseStatus = updatePurchaseStatus;
