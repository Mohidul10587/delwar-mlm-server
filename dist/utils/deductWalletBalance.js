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
exports.deductWalletBalance = void 0;
const deductWalletBalance = (wallet, amount, session) => __awaiter(void 0, void 0, void 0, function* () {
    if (wallet.earnedBalance < amount) {
        throw new Error("Insufficient balance");
    }
    const previousTotal = wallet.earnedBalance;
    wallet.earnedBalance -= amount;
    yield wallet.save({ session });
    return {
        previousTotal,
        currentTotal: wallet.earnedBalance,
    };
});
exports.deductWalletBalance = deductWalletBalance;
