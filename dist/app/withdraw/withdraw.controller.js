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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateStatus = exports.getMyWithdrawals = exports.getWithdrawRequestsForAdmin = exports.createWithdrawRequest = void 0;
const withdraw_model_1 = __importDefault(require("./withdraw.model"));
const model_1 = require("../transaction/model");
const model_2 = require("../wallet/model");
const model_3 = require("../user/model");
// Create a new withdraw request
const createWithdrawRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { amount } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const user = yield model_3.User.findById(userId);
        if (!((_b = user === null || user === void 0 ? void 0 : user.withdrawNumber) === null || _b === void 0 ? void 0 : _b.number)) {
            return res
                .status(400)
                .json({ message: "Please add withdrawal number first" });
        }
        const wallet = yield model_2.Wallet.findOne({ userId });
        if (!wallet || wallet.earnedBalance < amount) {
            return res.status(400).json({ message: "Insufficient balance" });
        }
        const previousTotal = wallet.earnedBalance;
        wallet.earnedBalance -= amount;
        yield wallet.save();
        const newWithdrawRequest = yield withdraw_model_1.default.create({
            amount,
            accountNumber: user.withdrawNumber.number,
            withdrawalMethod: user.withdrawNumber.method,
            userId,
        });
        yield model_1.Transaction.create({
            userId,
            withdrawId: newWithdrawRequest._id,
            previousAmount: previousTotal,
            recentAmount: -amount,
            currentTotal: wallet.earnedBalance,
            description: "Withdrawal Request",
            type: "debit",
        });
        res.status(201).json({
            message: "Withdraw request created successfully",
            withdrawRequest: newWithdrawRequest,
        });
    }
    catch (error) {
        res.status(500).json({ message: "Error creating withdraw request", error });
    }
});
exports.createWithdrawRequest = createWithdrawRequest;
// Get all withdraw requests for a seller
const getWithdrawRequestsForAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const withdrawRequests = yield withdraw_model_1.default.find()
            .populate({
            path: "userId",
            model: "User",
            select: "name email phone username",
        })
            .sort({ createdAt: -1 });
        res.status(200).json({
            message: "Withdraw requests fetched successfully",
            withdrawRequests,
        });
    }
    catch (error) {
        res
            .status(500)
            .json({ message: "Error fetching withdraw requests", error });
    }
});
exports.getWithdrawRequestsForAdmin = getWithdrawRequestsForAdmin;
// Get my withdrawals
const getMyWithdrawals = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const withdrawals = yield withdraw_model_1.default.find({ userId }).sort({
            createdAt: -1,
        });
        res.status(200).json(withdrawals);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching withdrawals", error });
    }
});
exports.getMyWithdrawals = getMyWithdrawals;
// Update withdraw request status
const updateStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { withdrawId } = req.params;
    const { status } = req.body;
    if (!["Pending", "Rejected", "Approved"].includes(status)) {
        return res.status(400).json({ message: "Invalid status provided" });
    }
    try {
        const withdrawRequest = yield withdraw_model_1.default.findById(withdrawId);
        if (!withdrawRequest) {
            return res.status(404).json({ message: "Withdraw request not found" });
        }
        withdrawRequest.status = status;
        if (status === "Rejected" && req.body.rejectionReason) {
            withdrawRequest.rejectionReason = req.body.rejectionReason;
        }
        yield withdrawRequest.save();
        if (status === "Approved") {
            yield model_1.Transaction.create({
                userId: withdrawRequest.userId,
                withdrawId: withdrawRequest._id,
                previousAmount: null,
                recentAmount: -withdrawRequest.amount,
                currentTotal: null,
                description: "Withdrawal Approved",
                type: "debit",
            });
        }
        else if (status === "Rejected") {
            const wallet = yield model_2.Wallet.findOne({ userId: withdrawRequest.userId });
            if (wallet) {
                const previousTotal = wallet.earnedBalance;
                wallet.earnedBalance += withdrawRequest.amount;
                yield wallet.save();
                yield model_1.Transaction.create({
                    userId: withdrawRequest.userId,
                    withdrawId: withdrawRequest._id,
                    previousAmount: previousTotal,
                    recentAmount: withdrawRequest.amount,
                    currentTotal: wallet.earnedBalance,
                    description: "Withdrawal Rejected - Refund",
                    type: "credit",
                });
            }
        }
        return res.status(200).json(withdrawRequest);
    }
    catch (error) {
        console.error("Error updating withdraw status:", error);
        return res.status(500).json({ message: "Server error" });
    }
});
exports.updateStatus = updateStatus;
