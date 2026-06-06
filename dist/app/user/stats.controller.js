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
exports.getSuperAdminStats = void 0;
const model_1 = require("./model");
const model_2 = require("../share/model");
const model_3 = require("../purchase/model");
const model_4 = require("../withdrawal/model");
const model_5 = require("../wallet/model");
const getSuperAdminStats = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    const [totalUsers, activeUsers, totalShares, totalPurchases, pendingPurchases, approvedPurchases, pendingWithdrawals, approvedWithdrawals, walletAgg,] = yield Promise.all([
        model_1.User.countDocuments({ role: "user" }),
        model_1.User.countDocuments({ role: "user", isActive: true }),
        model_2.Share.countDocuments(),
        model_3.Purchase.countDocuments(),
        model_3.Purchase.countDocuments({ status: "pending" }),
        model_3.Purchase.countDocuments({ status: "approved" }),
        model_4.Withdrawal.countDocuments({ status: "pending" }),
        model_4.Withdrawal.countDocuments({ status: "approved" }),
        model_5.Wallet.aggregate([{ $group: { _id: null, totalBalance: { $sum: "$balance" }, totalManagerialCommission: { $sum: "$pendingManagerialCommissionBalance" } } }]),
    ]);
    res.json({
        totalUsers,
        activeUsers,
        totalShares,
        totalPurchases,
        pendingPurchases,
        approvedPurchases,
        pendingWithdrawals,
        approvedWithdrawals,
        totalWalletBalance: (_b = (_a = walletAgg[0]) === null || _a === void 0 ? void 0 : _a.totalBalance) !== null && _b !== void 0 ? _b : 0,
        totalManagerialCommissionBalance: (_d = (_c = walletAgg[0]) === null || _c === void 0 ? void 0 : _c.totalManagerialCommission) !== null && _d !== void 0 ? _d : 0,
    });
});
exports.getSuperAdminStats = getSuperAdminStats;
