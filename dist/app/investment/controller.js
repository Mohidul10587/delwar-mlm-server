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
exports.distributeProfit = exports.getAllInvestments = exports.getMyInvestments = exports.createInvestment = void 0;
const model_1 = require("./model");
const model_2 = require("../settings/model");
const model_3 = require("../wallet/model");
const isTransactionIdUsed_1 = require("../../utils/isTransactionIdUsed");
const getInvestmentConfig = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const settings = yield model_2.Settings.findOne().lean();
    return (_a = settings === null || settings === void 0 ? void 0 : settings.investmentConfig) !== null && _a !== void 0 ? _a : null;
});
const createInvestment = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { profitType, amount, senderAccount, transactionId, buyerInfo } = req.body;
        if (!senderAccount || !transactionId)
            return res.status(400).json({ message: "Account number and transaction ID are required" });
        if (!["monthly", "partial", "maturity"].includes(profitType))
            return res.status(400).json({ message: "Invalid profit type" });
        const parsedAmount = Number(amount);
        if (!parsedAmount || parsedAmount <= 0)
            return res.status(400).json({ message: "Invalid investment amount" });
        const config = yield getInvestmentConfig();
        if (!config)
            return res.status(404).json({ message: "Investment config not found" });
        const profitConfig = config[profitType];
        const minAmount = (_a = profitConfig === null || profitConfig === void 0 ? void 0 : profitConfig.minAmount) !== null && _a !== void 0 ? _a : 0;
        if (parsedAmount < minAmount)
            return res.status(400).json({ message: `Minimum investment is ৳${minAmount.toLocaleString()}` });
        const duplicate = yield (0, isTransactionIdUsed_1.isTransactionIdUsed)(transactionId);
        if (duplicate)
            return res.status(400).json({ message: "This transaction ID has already been used" });
        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setFullYear(endDate.getFullYear() + 5);
        const investment = yield model_1.Investment.create({
            userId: req.user._id,
            profitType,
            amount: parsedAmount,
            originalAmount: parsedAmount,
            senderAccount,
            transactionId,
            buyerInfo: buyerInfo !== null && buyerInfo !== void 0 ? buyerInfo : null,
            startDate,
            endDate,
        });
        res.status(201).json({ message: "Investment created", investment });
    }
    catch (err) {
        next(err);
    }
});
exports.createInvestment = createInvestment;
const getMyInvestments = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const investments = yield model_1.Investment.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean();
        res.json({ investments });
    }
    catch (err) {
        next(err);
    }
});
exports.getMyInvestments = getMyInvestments;
const getAllInvestments = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const filter = {};
        if (req.query.status)
            filter.status = req.query.status;
        if (req.query.profitType)
            filter.profitType = req.query.profitType;
        const [investments, total] = yield Promise.all([
            model_1.Investment.find(filter)
                .populate("userId", "name username phone")
                .sort({ createdAt: -1 })
                .skip(skip).limit(limit).lean(),
            model_1.Investment.countDocuments(filter),
        ]);
        res.json({ investments, total, page, pages: Math.ceil(total / limit) });
    }
    catch (err) {
        next(err);
    }
});
exports.getAllInvestments = getAllInvestments;
const distributeProfit = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const investment = yield model_1.Investment.findById(req.params.id);
        if (!investment)
            return res.status(404).json({ message: "Investment not found" });
        if (investment.status === "completed")
            return res.status(400).json({ message: "Investment already completed" });
        const config = yield getInvestmentConfig();
        if (!config)
            return res.status(500).json({ message: "Investment config not found" });
        const profitConfig = config[investment.profitType];
        const { customAmount } = req.body;
        const now = new Date();
        if (investment.profitType === "maturity") {
            if (now < new Date(investment.endDate))
                return res.status(400).json({ message: "Maturity profit is only payable after the 5-year term ends" });
            const totalProfit = (investment.amount / 60) * (profitConfig.profitPercentage / 100) * 60;
            const defaultPayout = investment.amount + totalProfit;
            const totalPayout = customAmount != null && customAmount > 0 ? customAmount : defaultPayout;
            const wallet = yield model_3.Wallet.findOneAndUpdate({ userId: investment.userId }, { $inc: { balance: totalPayout } }, { new: true, upsert: true });
            yield model_3.TransactionLog.create({
                userId: investment.userId, type: "admin_credit", amount: totalPayout,
                balanceAfter: wallet.balance, note: `Maturity payout ৳${totalPayout.toFixed(2)}`,
            });
            investment.lastProfitPaidAt = now;
            investment.lastProfitPaidMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
            investment.status = "completed";
            yield investment.save();
            return res.json({ message: "Maturity payout completed", profitAmount: totalPayout });
        }
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        let calculatedProfit;
        if (investment.profitType === "partial") {
            const capitalReturn = (investment.originalAmount || investment.amount) / 60;
            calculatedProfit = (investment.amount * profitConfig.profitPercentage) / 100 + capitalReturn;
        }
        else {
            const monthlyProfit = ((investment.originalAmount || investment.amount) * profitConfig.profitPercentage) / 100;
            const isLastPayment = (investment.profitPaidCount + 1) >= 60;
            calculatedProfit = isLastPayment ? monthlyProfit + (investment.originalAmount || investment.amount) : monthlyProfit;
        }
        const profitAmount = customAmount != null && customAmount > 0 ? customAmount : calculatedProfit;
        const newProfitPaidCount = (investment.profitPaidCount || 0) + 1;
        const investmentUpdates = {
            lastProfitPaidAt: now,
            lastProfitPaidMonth: currentMonth,
            profitPaidCount: newProfitPaidCount,
        };
        if (investment.profitType === "partial") {
            const capitalReturn = (investment.originalAmount || investment.amount) / 60;
            const newAmount = Math.max(0, investment.amount - capitalReturn);
            investmentUpdates.amount = newAmount;
            if (newAmount === 0)
                investmentUpdates.status = "completed";
        }
        if (investment.profitType === "monthly" && newProfitPaidCount >= 60) {
            investmentUpdates.status = "completed";
        }
        const claimed = yield model_1.Investment.findOneAndUpdate({ _id: investment._id, lastProfitPaidMonth: { $ne: currentMonth }, status: { $ne: "completed" } }, { $set: investmentUpdates }, { new: true });
        if (!claimed)
            return res.status(400).json({ message: "Profit already paid this month" });
        const wallet = yield model_3.Wallet.findOneAndUpdate({ userId: investment.userId }, { $inc: { balance: profitAmount } }, { new: true, upsert: true });
        yield model_3.TransactionLog.create({
            userId: investment.userId, type: "admin_credit", amount: profitAmount,
            balanceAfter: wallet.balance, note: `Investment profit (${investment.profitType}) ৳${profitAmount.toFixed(2)}`,
        });
        res.json({ message: "Profit distributed", profitAmount });
    }
    catch (err) {
        next(err);
    }
});
exports.distributeProfit = distributeProfit;
