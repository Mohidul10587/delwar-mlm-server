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
exports.rejectWithdrawal = exports.approveWithdrawal = exports.getWithdrawals = void 0;
const AffiliateWithdrawal_1 = require("../models/AffiliateWithdrawal");
const model_1 = __importDefault(require("../../user/model"));
// Get all withdrawal requests
const getWithdrawals = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { status, page = 1, limit = 10 } = req.query;
        const filter = {};
        if (status)
            filter.status = status;
        const withdrawals = yield AffiliateWithdrawal_1.AffiliateWithdrawal.find(filter)
            .populate("affiliate", "name email phone affiliateInfo.affiliateCode")
            .populate("processedBy", "name")
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));
        const total = yield AffiliateWithdrawal_1.AffiliateWithdrawal.countDocuments(filter);
        res.json({
            success: true,
            data: withdrawals,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});
exports.getWithdrawals = getWithdrawals;
// Approve withdrawal request
const approveWithdrawal = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const { transactionId } = req.body;
        const withdrawal = yield AffiliateWithdrawal_1.AffiliateWithdrawal.findById(id);
        if (!withdrawal) {
            return res
                .status(404)
                .json({ success: false, message: "Withdrawal request not found" });
        }
        if (withdrawal.status !== "pending") {
            return res
                .status(400)
                .json({ success: false, message: "Withdrawal already processed" });
        }
        // Check affiliate balance
        const affiliate = yield model_1.default.findById(withdrawal.affiliate);
        if (!affiliate ||
            affiliate.affiliateInfo.currentBalance < withdrawal.amount) {
            return res
                .status(400)
                .json({ success: false, message: "Insufficient balance" });
        }
        withdrawal.status = "approved";
        withdrawal.processedBy = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        withdrawal.processedAt = new Date();
        withdrawal.transactionId = transactionId;
        yield withdrawal.save();
        // Update affiliate balance
        yield model_1.default.findByIdAndUpdate(withdrawal.affiliate, {
            $inc: {
                "affiliateInfo.currentBalance": -withdrawal.amount,
                "affiliateInfo.totalWithdrawn": withdrawal.amount,
            },
        });
        res.json({
            success: true,
            message: "Withdrawal approved successfully",
            data: withdrawal,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});
exports.approveWithdrawal = approveWithdrawal;
// Reject withdrawal request
const rejectWithdrawal = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const withdrawal = yield AffiliateWithdrawal_1.AffiliateWithdrawal.findById(id);
        if (!withdrawal) {
            return res
                .status(404)
                .json({ success: false, message: "Withdrawal request not found" });
        }
        if (withdrawal.status !== "pending") {
            return res
                .status(400)
                .json({ success: false, message: "Withdrawal already processed" });
        }
        withdrawal.status = "rejected";
        withdrawal.processedBy = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        withdrawal.processedAt = new Date();
        withdrawal.rejectionReason = reason;
        yield withdrawal.save();
        res.json({
            success: true,
            message: "Withdrawal rejected successfully",
            data: withdrawal,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});
exports.rejectWithdrawal = rejectWithdrawal;
