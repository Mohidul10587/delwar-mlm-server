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
const express_1 = require("express");
const model_1 = require("../purchase/model");
const installment_model_1 = require("../purchase/installment.model");
const model_2 = require("../certificate/model");
const model_3 = require("../wallet/model");
const commissionDebug_model_1 = require("../purchase/commissionDebug.model");
const router = (0, express_1.Router)();
router.get("/commission-debug", (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const logs = yield commissionDebug_model_1.CommissionDebug.find().sort({ createdAt: -1 }).lean();
    res.json({ logs });
}));
router.delete("/commission-debug", (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield commissionDebug_model_1.CommissionDebug.deleteMany({});
    res.json({ message: "Commission debug logs cleared" });
}));
router.get("/", (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield Promise.all([
        model_1.Purchase.deleteMany({}),
        installment_model_1.InstallmentPayment.deleteMany({}),
        model_2.Certificate.deleteMany({}),
        model_3.TransactionLog.deleteMany({}),
        commissionDebug_model_1.CommissionDebug.deleteMany({}),
        model_3.Wallet.updateMany({}, {
            balance: 0,
            pendingManagerialCommissionBalance: 0,
        }),
    ]);
    res.json({ message: "Reset complete" });
}));
exports.default = router;
