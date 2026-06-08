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
exports.updateWithdrawalStatus = exports.getMyWithdrawals = exports.getWithdrawals = exports.createWithdrawal = void 0;
const model_1 = require("./model");
const model_2 = require("../wallet/model");
const findOrCreateWallet = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    return yield model_2.Wallet.findOne({ userId });
});
const createWithdrawal = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { amount, method, accountDetails } = req.body;
        const amt = Number(amount);
        const wallet = yield findOrCreateWallet(req.user._id.toString());
        if (!wallet)
            return res.status(404).json({ message: "Wallet not found" });
        if (wallet.balance < amt)
            return res.status(400).json({ message: "Insufficient balance" });
        wallet.balance -= amt;
        yield wallet.save();
        yield model_2.TransactionLog.create({ userId: req.user._id, type: "withdrawal", amount: amt, balanceAfter: wallet.balance, note: `${method}: ${accountDetails}` });
        const withdrawal = yield model_1.Withdrawal.create({ userId: req.user._id, amount: amt, method, accountDetails });
        res.status(201).json({ message: "Withdrawal request submitted", withdrawal });
    }
    catch (err) {
        next(err);
    }
});
exports.createWithdrawal = createWithdrawal;
const getWithdrawals = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const withdrawals = yield model_1.Withdrawal.find()
            .populate("userId", "name username phone")
            .sort({ createdAt: -1 }).lean();
        res.json({ withdrawals });
    }
    catch (err) {
        next(err);
    }
});
exports.getWithdrawals = getWithdrawals;
const getMyWithdrawals = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const withdrawals = yield model_1.Withdrawal.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean();
        res.json({ withdrawals });
    }
    catch (err) {
        next(err);
    }
});
exports.getMyWithdrawals = getMyWithdrawals;
const updateWithdrawalStatus = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { status, reviewNote } = req.body;
        if (!["approved", "rejected"].includes(status))
            return res.status(400).json({ message: "Invalid status" });
        const withdrawal = yield model_1.Withdrawal.findById(req.params.id);
        if (!withdrawal)
            return res.status(404).json({ message: "Withdrawal not found" });
        if (withdrawal.status !== "pending")
            return res.status(400).json({ message: "Already reviewed" });
        if (status === "rejected") {
            const wallet = yield findOrCreateWallet(withdrawal.userId.toString());
            if (wallet) {
                wallet.balance += withdrawal.amount;
                yield wallet.save();
                yield model_2.TransactionLog.create({ userId: withdrawal.userId, type: "withdrawal_rejected", amount: withdrawal.amount, balanceAfter: wallet.balance, note: reviewNote || "Withdrawal rejected" });
            }
        }
        withdrawal.status = status;
        withdrawal.reviewNote = String(reviewNote !== null && reviewNote !== void 0 ? reviewNote : "").trim();
        withdrawal.reviewedBy = req.user._id;
        withdrawal.reviewedAt = new Date();
        yield withdrawal.save();
        res.json({ message: `Withdrawal ${status}`, withdrawal });
    }
    catch (err) {
        next(err);
    }
});
exports.updateWithdrawalStatus = updateWithdrawalStatus;
