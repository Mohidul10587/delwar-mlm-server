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
exports.myDeposits = exports.rejectDeposit = exports.approveDeposit = exports.allForAdmin = exports.create = void 0;
const model_1 = require("./model");
const model_2 = require("../wallet/model");
const model_3 = require("../transaction/model");
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { amount, paymentMethod, transactionId, mobileNumber } = req.body;
        const newDeposit = yield model_1.Deposit.create({
            userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id,
            amount,
            paymentMethod,
            transactionId,
            mobileNumber,
        });
        res.status(201).json({
            message: "Deposit request created successfully",
            deposit: newDeposit,
        });
    }
    catch (error) {
        res.status(500).json({ message: "Error creating deposit", error });
    }
});
exports.create = create;
const allForAdmin = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const items = yield model_1.Deposit.find()
            .populate("userId", "name email")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        const total = yield model_1.Deposit.countDocuments();
        res
            .status(200)
            .json({ deposits: items, total, page, pages: Math.ceil(total / limit) });
    }
    catch (error) {
        next(error);
    }
});
exports.allForAdmin = allForAdmin;
const approveDeposit = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const deposit = yield model_1.Deposit.findById(id);
        if (!deposit)
            return res.status(404).json({ message: "Deposit not found." });
        if (deposit.status !== "Pending")
            return res.status(400).json({ message: "Deposit already processed." });
        deposit.status = "Approved";
        yield deposit.save();
        let wallet = yield model_2.Wallet.findOne({ userId: deposit.userId });
        const previousAmount = wallet
            ? wallet.depositedBalance + wallet.earnedBalance
            : 0;
        if (!wallet) {
            wallet = yield model_2.Wallet.create({
                userId: deposit.userId,
                depositedBalance: deposit.amount,
                earnedBalance: 0,
            });
        }
        else {
            wallet.depositedBalance += deposit.amount;
            yield wallet.save();
        }
        yield model_3.Transaction.create({
            userId: deposit.userId,
            depositId: deposit._id,
            previousAmount,
            recentAmount: deposit.amount,
            currentTotal: wallet.depositedBalance + wallet.earnedBalance,
            description: "Deposit",
            type: "credit",
        });
        res
            .status(200)
            .json({ message: "Deposit approved successfully!", deposit });
    }
    catch (error) {
        next(error);
    }
});
exports.approveDeposit = approveDeposit;
const rejectDeposit = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const deposit = yield model_1.Deposit.findById(id);
        if (!deposit)
            return res.status(404).json({ message: "Deposit not found." });
        if (deposit.status !== "Pending")
            return res.status(400).json({ message: "Deposit already processed." });
        deposit.status = "Rejected";
        yield deposit.save();
        res
            .status(200)
            .json({ message: "Deposit rejected successfully!", deposit });
    }
    catch (error) {
        next(error);
    }
});
exports.rejectDeposit = rejectDeposit;
const myDeposits = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const items = yield model_1.Deposit.find({ userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id }).sort({
            createdAt: -1,
        });
        res.status(200).json(items);
    }
    catch (error) {
        next(error);
    }
});
exports.myDeposits = myDeposits;
