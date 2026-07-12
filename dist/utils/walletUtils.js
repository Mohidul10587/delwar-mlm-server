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
exports.findOrCreateWallet = void 0;
const model_1 = require("../app/wallet/model");
/**
 * Shared utility — find or atomically create a wallet for a user.
 * Uses findOneAndUpdate with upsert to avoid race conditions when
 * two concurrent requests try to create the same wallet.
 */
const findOrCreateWallet = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    return yield model_1.Wallet.findOneAndUpdate({ userId }, {
        $setOnInsert: {
            userId,
            totalBalance: 0,
            directCommissionBalance: 0,
            manCommFromDownPayment: 0,
            manCommFromInstallment: 0,
            salaryBalanceFromRanks: 0,
            cashbackBalance: 0,
            transferBalance: 0,
        },
    }, { upsert: true, new: true });
});
exports.findOrCreateWallet = findOrCreateWallet;
