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
exports.getMyCertificates = void 0;
const model_1 = require("./model");
const service_1 = require("../purchase/service");
// GET /certificate/my — logged-in user's own certificates with share & purchase info
const getMyCertificates = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const certificates = yield model_1.Certificate.find({ userId: req.user._id })
            .populate("shareId", "title image cashPrice installment")
            .populate("purchaseId", "paymentType amountPaid quantity status")
            .sort({ createdAt: -1 })
            .lean();
        const enriched = certificates.map((c) => {
            var _a, _b;
            const share = c.shareId;
            const purchase = c.purchaseId;
            const totalPayable = (share === null || share === void 0 ? void 0 : share.cashPrice)
                ? (0, service_1.calculateTotalPayable)(Number(share.cashPrice), (_a = purchase === null || purchase === void 0 ? void 0 : purchase.quantity) !== null && _a !== void 0 ? _a : 1)
                : 0;
            const amountPaid = (_b = purchase === null || purchase === void 0 ? void 0 : purchase.amountPaid) !== null && _b !== void 0 ? _b : 0;
            return Object.assign(Object.assign({}, c), { totalPayable, amountRemaining: Math.max(0, totalPayable - amountPaid) });
        });
        res.json({ certificates: enriched });
    }
    catch (err) {
        next(err);
    }
});
exports.getMyCertificates = getMyCertificates;
