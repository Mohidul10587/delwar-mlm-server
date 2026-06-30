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
exports.adminGiveIncentiveBonus = exports.adminDebit = exports.adminCredit = exports.getMyTransactions = exports.getWalletByUser = exports.getMyWallet = void 0;
const model_1 = require("./model");
const model_2 = require("../ledger/model");
const findOrCreate = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    let wallet = yield model_1.Wallet.findOne({ userId });
    if (!wallet)
        wallet = yield model_1.Wallet.create({
            userId,
            totalBalance: 0,
            directCommissionBalance: 0,
            manCommFromDownPayment: 0,
            manCommFromInstallment: 0,
            salaryBalance: 0,
            rewardBalance: 0,
            incentiveBonus: 0,
        });
    return wallet;
});
const getMyWallet = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const wallet = yield findOrCreate(req.user._id.toString());
        const transactions = yield model_1.TransactionLog.find({ userId: req.user._id })
            .sort({ createdAt: -1 }).limit(20).lean();
        res.json({ wallet, transactions });
    }
    catch (err) {
        next(err);
    }
});
exports.getMyWallet = getMyWallet;
const getWalletByUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const wallet = yield findOrCreate(req.params.userId);
        const transactions = yield model_1.TransactionLog.find({ userId: req.params.userId })
            .sort({ createdAt: -1 }).limit(50).lean();
        res.json({ wallet, transactions });
    }
    catch (err) {
        next(err);
    }
});
exports.getWalletByUser = getWalletByUser;
const getMyTransactions = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 30;
        const skip = (page - 1) * limit;
        const filter = { userId: req.user._id };
        if (req.query.type)
            filter.type = req.query.type;
        if (req.query.startDate || req.query.endDate) {
            filter.createdAt = {};
            if (req.query.startDate)
                filter.createdAt.$gte = new Date(req.query.startDate);
            if (req.query.endDate) {
                const end = new Date(req.query.endDate);
                end.setHours(23, 59, 59, 999);
                filter.createdAt.$lte = end;
            }
        }
        const [transactions, total] = yield Promise.all([
            model_1.TransactionLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            model_1.TransactionLog.countDocuments(filter),
        ]);
        res.json({ transactions, total, page, pages: Math.ceil(total / limit) });
    }
    catch (err) {
        next(err);
    }
});
exports.getMyTransactions = getMyTransactions;
const adminCredit = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { amount, note } = req.body;
        const wallet = yield findOrCreate(req.params.userId);
        if (!wallet)
            return res.status(404).json({ message: "Wallet not found" });
        wallet.directCommissionBalance += Number(amount);
        yield wallet.save();
        yield model_1.TransactionLog.create({ userId: req.params.userId, type: "admin_credit", amount, balanceAfter: wallet.directCommissionBalance, note: note || "" });
        res.json({ message: "Credited", wallet });
    }
    catch (err) {
        next(err);
    }
});
exports.adminCredit = adminCredit;
const adminDebit = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { amount, note } = req.body;
        const wallet = yield findOrCreate(req.params.userId);
        if (!wallet)
            return res.status(404).json({ message: "Wallet not found" });
        wallet.directCommissionBalance = Math.max(0, wallet.directCommissionBalance - Number(amount));
        yield wallet.save();
        yield model_1.TransactionLog.create({ userId: req.params.userId, type: "admin_debit", amount, balanceAfter: wallet.directCommissionBalance, note: note || "" });
        res.json({ message: "Debited", wallet });
    }
    catch (err) {
        next(err);
    }
});
exports.adminDebit = adminDebit;
const adminGiveIncentiveBonus = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { amount, note } = req.body;
        if (!amount || Number(amount) <= 0) {
            return res.status(400).json({ message: "Amount must be greater than 0" });
        }
        const wallet = yield findOrCreate(req.params.userId);
        wallet.incentiveBonus = ((_a = wallet.incentiveBonus) !== null && _a !== void 0 ? _a : 0) + Number(amount);
        yield wallet.save();
        // Transaction log
        yield model_1.TransactionLog.create({
            userId: req.params.userId,
            type: "incentive_bonus",
            amount: Number(amount),
            balanceAfter: wallet.totalBalance,
            note: note || "Incentive bonus granted by admin",
        });
        // Company ledger
        yield model_2.CompanyLedger.create({
            date: new Date(),
            type: "incentive_bonus_paid",
            amount: Number(amount),
            userId: req.params.userId,
            note: note || "Incentive bonus granted by admin",
        });
        res.json({ message: "Incentive bonus granted successfully", wallet });
    }
    catch (err) {
        next(err);
    }
});
exports.adminGiveIncentiveBonus = adminGiveIncentiveBonus;
