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
exports.runManagerialCommissionCron = exports.runTeamCommissionCron = void 0;
const model_1 = require("../wallet/model");
const model_2 = require("../settings/model");
const runTeamCommissionCron = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const settings = yield model_2.Settings.findOne();
    const dailyLimit = (_a = settings === null || settings === void 0 ? void 0 : settings.teamManagementDailyLimit) !== null && _a !== void 0 ? _a : 5000;
    const wallets = yield model_1.Wallet.find({ pendingTeamManagementCommissionOfSideA: { $gt: 0 }, pendingTeamManagementCommissionOfSideB: { $gt: 0 } });
    let processed = 0;
    for (const wallet of wallets) {
        const minSide = Math.min(wallet.pendingTeamManagementCommissionOfSideA, wallet.pendingTeamManagementCommissionOfSideB);
        const commission = Math.min(minSide, dailyLimit); // dailyLimit-এর বেশি হলে বাকি বাতিল
        wallet.balance += commission;
        wallet.pendingTeamManagementCommissionOfSideA -= minSide; // পুরো matched volume deduct — carry হবে না
        wallet.pendingTeamManagementCommissionOfSideB -= minSide;
        yield wallet.save();
        yield model_1.TransactionLog.create({
            userId: wallet.userId,
            type: "team_commission",
            amount: commission,
            balanceAfter: wallet.balance,
            note: `Team commission: min(${minSide}), limit applied`,
        });
        processed++;
    }
    return processed;
});
exports.runTeamCommissionCron = runTeamCommissionCron;
const runManagerialCommissionCron = () => __awaiter(void 0, void 0, void 0, function* () {
    const wallets = yield model_1.Wallet.find({ pendingManagerialCommissionBalance: { $gt: 0 } });
    let processed = 0;
    for (const wallet of wallets) {
        const amount = wallet.pendingManagerialCommissionBalance;
        wallet.balance += amount;
        wallet.pendingManagerialCommissionBalance = 0;
        yield wallet.save();
        yield model_1.TransactionLog.create({
            userId: wallet.userId,
            type: "managerial_commission",
            amount,
            balanceAfter: wallet.balance,
            note: "Managerial commission transfer",
        });
        processed++;
    }
    return processed;
});
exports.runManagerialCommissionCron = runManagerialCommissionCron;
