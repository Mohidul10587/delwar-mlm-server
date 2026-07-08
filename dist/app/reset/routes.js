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
const shareSlot_model_1 = require("../project/shareSlot.model");
const model_6 = require("../settings/model");
const router = (0, express_1.Router)();
router.get("/", (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (process.env.NODE_ENV === "production") {
        return res.status(403).json({ message: "Not allowed in production" });
    }
    try {
        // Resolve first rank name before resetting users
        const settings = yield model_6.Settings.findOne().select("ranks").lean();
        const firstRankName = Array.isArray(settings === null || settings === void 0 ? void 0 : settings.ranks) && settings.ranks.length > 0
            ? settings.ranks[0].name
            : null;
        const rankResetFields = firstRankName
            ? {
                currentRank: firstRankName,
                currentRankAchievedAt: new Date(),
                earnedRanks: [firstRankName],
            }
            : {
                currentRank: null,
                currentRankAchievedAt: null,
                earnedRanks: [],
            };
        yield Promise.all([
            model_1.Purchase.deleteMany({}),
            installment_model_1.InstallmentPayment.deleteMany({}),
            model_2.Certificate.deleteMany({}),
            model_3.TransactionLog.deleteMany({}),
            salary_log_model_1.RankSalaryLog.deleteMany({}),
            model_5.CompanyLedger.deleteMany({}),
            model_3.Wallet.updateMany({}, {
                $set: {
                    directCommissionBalance: 0,
                    manCommFromDownPayment: 0,
                    manCommFromInstallment: 0,
                    salaryBalanceFromRanks: 0,
                    incentiveBonus: 0,
                    transferBalance: 0,
                    loanBalance: 0,
                    fixedMonthlySalaryForAdminOnly: 0,
                    expenseReimbursementBalance: 0,
                    totalBalance: 0,
                },
            }),
            model_4.User.updateMany({}, {
                $set: Object.assign(Object.assign({}, rankResetFields), { directSalesCount: 0, teamSalesCount: 0, personalPurchaseCount: 0 }),
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
        return res.json({ message: "Full reset complete" });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return res.status(500).json({ message: `Reset failed: ${message}` });
    }
}));
exports.default = router;
