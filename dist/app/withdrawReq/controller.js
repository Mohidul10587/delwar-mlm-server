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
exports.getUserRequestById = exports.getUserRequests = exports.reject = exports.approve = exports.getById = exports.rejecteds = exports.approveds = exports.pendings = exports.allRequests = exports.create = void 0;
const model_1 = require("./model");
const model_2 = require("../sellerWallet/model");
const model_3 = require("../affiliateWallet/model");
const model_4 = __importDefault(require("../transaction/model"));
const model_5 = require("../siteWallet/model");
const model_6 = __importDefault(require("../user/model"));
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const { amount, method } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid withdraw amount",
            });
        }
        // Determine user type from user's role and affiliate status
        const user = yield model_6.default.findById(userId).select("role affiliateInfo");
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        let userType;
        let wallet;
        if (user.role === "seller") {
            userType = "SELLER";
            wallet = yield model_2.SellerWallet.findOne({ seller: userId });
        }
        else if (((_b = user.affiliateInfo) === null || _b === void 0 ? void 0 : _b.status) === "approved") {
            userType = "AFFILIATE";
            wallet = yield model_3.AffiliateWallet.findOne({ affiliate: userId });
        }
        else {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to make withdrawal requests",
            });
        }
        if (!wallet || wallet.balance < amount) {
            return res.status(400).json({
                success: false,
                message: "Insufficient wallet balance",
            });
        }
        const withdraw = yield model_1.WithdrawReq.create({
            user: userId,
            userType,
            amount,
            method,
            status: "PENDING",
        });
        res.status(201).json({
            success: true,
            message: "Withdraw request submitted",
            data: withdraw,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});
exports.create = create;
const allRequests = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = Math.max(Number(req.query.page) || 1, 1);
        const limit = Math.max(Number(req.query.limit) || 10, 1);
        const skip = (page - 1) * limit;
        const [requests, total] = yield Promise.all([
            model_1.WithdrawReq.find()
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("user", "name email")
                .populate("method")
                .lean(),
            model_1.WithdrawReq.countDocuments(),
        ]);
        res.status(200).json({
            success: true,
            data: requests,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});
exports.allRequests = allRequests;
const pendings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = Math.max(Number(req.query.page) || 1, 1);
        const limit = Math.max(Number(req.query.limit) || 10, 1);
        const skip = (page - 1) * limit;
        const [requests, total] = yield Promise.all([
            model_1.WithdrawReq.find({ status: "PENDING" })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("user", "name email")
                .populate("method")
                .lean(),
            model_1.WithdrawReq.countDocuments({ status: "PENDING" }),
        ]);
        res.status(200).json({
            success: true,
            data: requests,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});
exports.pendings = pendings;
const approveds = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = Math.max(Number(req.query.page) || 1, 1);
        const limit = Math.max(Number(req.query.limit) || 10, 1);
        const skip = (page - 1) * limit;
        const [requests, total] = yield Promise.all([
            model_1.WithdrawReq.find({ status: "APPROVED" })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("user", "name email")
                .populate("method")
                .lean(),
            model_1.WithdrawReq.countDocuments({ status: "APPROVED" }),
        ]);
        res.status(200).json({
            success: true,
            data: requests,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});
exports.approveds = approveds;
const rejecteds = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = Math.max(Number(req.query.page) || 1, 1);
        const limit = Math.max(Number(req.query.limit) || 10, 1);
        const skip = (page - 1) * limit;
        const [requests, total] = yield Promise.all([
            model_1.WithdrawReq.find({ status: "REJECTED" })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("user", "name email")
                .populate("method")
                .lean(),
            model_1.WithdrawReq.countDocuments({ status: "REJECTED" }),
        ]);
        res.status(200).json({
            success: true,
            data: requests,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});
exports.rejecteds = rejecteds;
const getById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const withdraw = yield model_1.WithdrawReq.findById(id)
            .populate("user", "name email phone userId")
            .populate("method")
            .lean();
        if (!withdraw) {
            return res.status(404).json({
                success: false,
                message: "Withdraw request not found",
            });
        }
        res.status(200).json({
            success: true,
            data: withdraw,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});
exports.getById = getById;
const approve = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { withdrawId } = req.params;
        const { transactionId, paymentMethod } = req.body;
        if (!transactionId || !paymentMethod) {
            return res.status(400).json({
                success: false,
                message: "Transaction ID and payment method are required",
            });
        }
        const withdraw = yield model_1.WithdrawReq.findById(withdrawId);
        if (!withdraw || withdraw.status !== "PENDING") {
            return res.status(400).json({
                success: false,
                message: "Invalid withdraw request",
            });
        }
        const wallet = withdraw.userType === "SELLER"
            ? yield model_2.SellerWallet.findOne({ seller: withdraw.user })
            : yield model_3.AffiliateWallet.findOne({ affiliate: withdraw.user });
        const siteWallet = yield model_5.SiteWallet.findOne({});
        if (!wallet || wallet.balance < withdraw.amount) {
            return res.status(400).json({
                success: false,
                message: "Insufficient balance",
            });
        }
        if (!siteWallet || siteWallet.balance < withdraw.amount) {
            throw new Error("Site wallet insufficient");
        }
        wallet.balance -= withdraw.amount;
        wallet.totalWithdrawn += withdraw.amount;
        siteWallet.balance -= withdraw.amount;
        siteWallet.totalWithdrawn += withdraw.amount;
        yield Promise.all([wallet.save(), siteWallet.save()]);
        const transactionType = withdraw.userType === "SELLER"
            ? "SELLER_WITHDRAW_APPROVED"
            : "AFFILIATE_WITHDRAW_APPROVED";
        yield model_4.default.create([
            {
                owner: withdraw.userType,
                [withdraw.userType === "SELLER" ? "seller" : "affiliate"]: withdraw.user,
                type: transactionType,
                flow: "DEBIT",
                amount: withdraw.amount,
                note: "Approved your withdraw request",
            },
            {
                owner: "SITE",
                type: transactionType,
                flow: "DEBIT",
                amount: withdraw.amount,
                note: `Withdraw payout to ${withdraw.userType.toLowerCase()}`,
            },
        ]);
        withdraw.status = "APPROVED";
        withdraw.transactionId = transactionId;
        withdraw.paymentMethod = paymentMethod;
        yield withdraw.save();
        res.status(200).json({
            success: true,
            message: "Withdraw approved successfully",
            wallet,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});
exports.approve = approve;
const reject = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { withdrawId } = req.params;
        const withdraw = yield model_1.WithdrawReq.findById(withdrawId);
        if (!withdraw || withdraw.status !== "PENDING") {
            return res.status(400).json({
                success: false,
                message: "Invalid withdraw request",
            });
        }
        withdraw.status = "REJECTED";
        yield withdraw.save();
        const transactionType = withdraw.userType === "SELLER"
            ? "SELLER_WITHDRAW_REJECTED"
            : "AFFILIATE_WITHDRAW_REJECTED";
        yield model_4.default.create({
            owner: withdraw.userType,
            [withdraw.userType === "SELLER" ? "seller" : "affiliate"]: withdraw.user,
            type: transactionType,
            flow: "CREDIT",
            amount: 0,
            note: "Withdraw request rejected by admin",
        });
        res.status(200).json({
            success: true,
            message: "Withdraw request rejected",
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});
exports.reject = reject;
const getUserRequests = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const page = Math.max(Number(req.query.page) || 1, 1);
        const limit = Math.max(Number(req.query.limit) || 10, 1);
        const skip = (page - 1) * limit;
        const [requests, total] = yield Promise.all([
            model_1.WithdrawReq.find({ user: userId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("method")
                .select("amount method status userType transactionId paymentMethod createdAt updatedAt")
                .lean(),
            model_1.WithdrawReq.countDocuments({ user: userId }),
        ]);
        res.status(200).json({
            success: true,
            data: requests,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});
exports.getUserRequests = getUserRequests;
const getUserRequestById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const withdraw = yield model_1.WithdrawReq.findOne({
            _id: id,
            user: userId,
        }).lean();
        if (!withdraw) {
            return res.status(404).json({
                success: false,
                message: "Withdrawal request not found",
            });
        }
        res.status(200).json({
            success: true,
            data: withdraw,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});
exports.getUserRequestById = getUserRequestById;
