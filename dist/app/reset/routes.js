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
const model_4 = require("../user/model");
const salary_log_model_1 = require("../rank/salary-log.model");
const model_5 = require("../ledger/model");
const shareSlot_model_1 = require("../share/shareSlot.model");
const router = (0, express_1.Router)();
// Fix S-03: protected by superadmin auth + blocked in production
router.get("/", (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Hard block in production — this route must never run in production
    if (process.env.NODE_ENV === "production") {
        return res
            .status(403)
            .json({ message: "Reset is not allowed in production" });
    }
    yield Promise.all([
        model_1.Purchase.deleteMany({}),
        installment_model_1.InstallmentPayment.deleteMany({}),
        model_2.Certificate.deleteMany({}),
        model_3.TransactionLog.deleteMany({}),
        salary_log_model_1.RankSalaryLog.deleteMany({}),
        model_5.CompanyLedger.deleteMany({}),
        model_3.Wallet.updateMany({}, {
            manCommFromDownPayment: 0,
            manCommFromInstallment: 0,
            totalBalance: 0,
            directCommissionBalance: 0,
            salaryBalance: 0,
            rewardBalance: 0,
            incentiveBonus: 0,
            transferBalance: 0,
        }),
        model_4.User.updateMany({}, {
            currentRank: null,
            currentRankAchievedAt: null,
            earnedRanks: [],
            directSalesCount: 0,
            teamSalesCount: 0,
            personalSharesCount: 0,
        }),
        shareSlot_model_1.ShareSlot.updateMany({}, {
            $set: {
                status: "available",
                userId: null,
                purchaseId: null,
                reclaimedAt: null,
            },
        }),
    ]);
    res.json({ message: "Full reset complete" });
}));
exports.default = router;
