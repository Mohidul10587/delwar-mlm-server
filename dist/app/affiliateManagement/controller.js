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
exports.rejectWithdrawal = exports.approveWithdrawal = exports.getWithdrawals = exports.bulkApproveCommissions = exports.markCommissionPaid = exports.rejectCommission = exports.approveCommission = exports.getCommissions = exports.toggleAffiliateStatus = exports.rejectAffiliate = exports.approveAffiliate = exports.getAffiliateDetails = exports.getAffiliates = void 0;
const model_1 = require("./model");
const model_2 = __importDefault(require("../user/model"));
const generateCode_1 = require("../shared/generateCode");
// ============================================================================
// AFFILIATE MANAGEMENT CONTROLLERS
// ============================================================================
// Get all affiliates with filters
const getAffiliates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { status, search, page = 1, limit = 10 } = req.query;
        const filter = { "affiliateInfo.affiliateCode": { $exists: true } };
        if (status)
            filter["affiliateInfo.status"] = status;
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { "affiliateInfo.affiliateCode": { $regex: search, $options: "i" } },
            ];
        }
        const affiliates = yield model_2.default.find(filter)
            .select("name email phone affiliateInfo createdAt")
            .sort({ "affiliateInfo.appliedAt": -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));
        const total = yield model_2.default.countDocuments(filter);
        res.json({
            success: true,
            data: affiliates,
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
exports.getAffiliates = getAffiliates;
// Get affiliate details
const getAffiliateDetails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const affiliate = yield model_2.default.findById(id).select("-password");
        if (!affiliate) {
            return res
                .status(404)
                .json({ success: false, message: "Affiliate not found" });
        }
        const commissions = yield model_1.AffiliateCommission.find({ affiliate: id })
            .populate("product", "title price")
            .populate("order", "orderNumber")
            .sort({ createdAt: -1 })
            .limit(20);
        const withdrawals = yield model_1.AffiliateWithdrawal.find({ affiliate: id })
            .sort({ createdAt: -1 })
            .limit(10);
        const stats = yield model_1.AffiliateCommission.aggregate([
            { $match: { affiliate: affiliate._id } },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                    amount: { $sum: "$commissionAmount" },
                },
            },
        ]);
        res.json({
            success: true,
            data: {
                affiliate,
                commissions,
                withdrawals,
                stats,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});
exports.getAffiliateDetails = getAffiliateDetails;
// Approve affiliate request
const approveAffiliate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const affiliate = yield model_2.default.findById(id);
        if (!affiliate) {
            return res
                .status(404)
                .json({ success: false, message: "User not found" });
        }
        if (!affiliate.affiliateInfo.affiliateCode) {
            affiliate.affiliateInfo.affiliateCode = yield (0, generateCode_1.generateUniqueCode)("AFF");
        }
        affiliate.affiliateInfo.status = "approved";
        affiliate.affiliateInfo.isActive = true;
        affiliate.affiliateInfo.approvedAt = new Date();
        affiliate.affiliateInfo.approvedBy = (_a = req === null || req === void 0 ? void 0 : req.user) === null || _a === void 0 ? void 0 : _a._id;
        yield affiliate.save();
        res.json({
            success: true,
            message: "Affiliate approved successfully",
            data: affiliate,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});
exports.approveAffiliate = approveAffiliate;
// Reject affiliate request
const rejectAffiliate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const affiliate = yield model_2.default.findById(id);
        if (!affiliate) {
            return res
                .status(404)
                .json({ success: false, message: "User not found" });
        }
        affiliate.affiliateInfo.status = "rejected";
        affiliate.affiliateInfo.isActive = false;
        yield affiliate.save();
        res.json({
            success: true,
            message: "Affiliate rejected successfully",
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});
exports.rejectAffiliate = rejectAffiliate;
// Toggle affiliate status
const toggleAffiliateStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const affiliate = yield model_2.default.findById(id);
        if (!affiliate) {
            return res
                .status(404)
                .json({ success: false, message: "User not found" });
        }
        affiliate.affiliateInfo.isActive = !affiliate.affiliateInfo.isActive;
        if (!affiliate.affiliateInfo.isActive) {
            affiliate.affiliateInfo.status = "rejected";
        }
        else if (affiliate.affiliateInfo.status === "rejected") {
            affiliate.affiliateInfo.status = "approved";
        }
        yield affiliate.save();
        res.json({
            success: true,
            message: `Affiliate ${affiliate.affiliateInfo.isActive ? "enabled" : "disabled"} successfully`,
            data: affiliate,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});
exports.toggleAffiliateStatus = toggleAffiliateStatus;
// ============================================================================
// COMMISSION MANAGEMENT CONTROLLERS
// ============================================================================
// Get all commissions with filters
const getCommissions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { status, affiliate, page = 1, limit = 10 } = req.query;
        const filter = {};
        if (status)
            filter.status = status;
        if (affiliate)
            filter.affiliate = affiliate;
        const commissions = yield model_1.AffiliateCommission.find(filter)
            .populate("affiliate", "name email affiliateInfo.affiliateCode")
            .populate("product", "title price")
            .populate("order", "orderNumber")
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));
        const total = yield model_1.AffiliateCommission.countDocuments(filter);
        res.json({
            success: true,
            data: commissions,
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
exports.getCommissions = getCommissions;
// Approve commission
const approveCommission = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const commission = yield model_1.AffiliateCommission.findById(id);
        if (!commission) {
            return res
                .status(404)
                .json({ success: false, message: "Commission not found" });
        }
        if (commission.status !== "pending") {
            return res
                .status(400)
                .json({ success: false, message: "Commission already processed" });
        }
        commission.status = "approved";
        commission.approvedBy = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        commission.approvedAt = new Date();
        yield commission.save();
        // Update affiliate balance
        yield model_2.default.findByIdAndUpdate(commission.affiliate, {
            $inc: {
                "affiliateInfo.currentBalance": commission.commissionAmount,
                "affiliateInfo.totalEarned": commission.commissionAmount,
            },
        });
        res.json({
            success: true,
            message: "Commission approved successfully",
            data: commission,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});
exports.approveCommission = approveCommission;
// Reject commission
const rejectCommission = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const commission = yield model_1.AffiliateCommission.findById(id);
        if (!commission) {
            return res
                .status(404)
                .json({ success: false, message: "Commission not found" });
        }
        if (commission.status !== "pending") {
            return res
                .status(400)
                .json({ success: false, message: "Commission already processed" });
        }
        commission.status = "rejected";
        commission.rejectedBy = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        commission.rejectedAt = new Date();
        commission.rejectionReason = reason;
        yield commission.save();
        res.json({
            success: true,
            message: "Commission rejected successfully",
            data: commission,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});
exports.rejectCommission = rejectCommission;
// Mark commission as paid
const markCommissionPaid = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const { paymentMethod, transactionId } = req.body;
        const commission = yield model_1.AffiliateCommission.findById(id);
        if (!commission) {
            return res
                .status(404)
                .json({ success: false, message: "Commission not found" });
        }
        if (commission.status !== "approved") {
            return res
                .status(400)
                .json({ success: false, message: "Commission must be approved first" });
        }
        commission.status = "paid";
        commission.paidBy = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        commission.paidAt = new Date();
        commission.paymentMethod = paymentMethod;
        commission.transactionId = transactionId;
        yield commission.save();
        // Update affiliate balance
        yield model_2.default.findByIdAndUpdate(commission.affiliate, {
            $inc: {
                "affiliateInfo.currentBalance": -commission.commissionAmount,
                "affiliateInfo.totalWithdrawn": commission.commissionAmount,
            },
        });
        res.json({
            success: true,
            message: "Commission marked as paid successfully",
            data: commission,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});
exports.markCommissionPaid = markCommissionPaid;
// Bulk approve commissions
const bulkApproveCommissions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { commissionIds } = req.body;
        const commissions = yield model_1.AffiliateCommission.find({
            _id: { $in: commissionIds },
            status: "pending",
        });
        const updates = commissions.map((commission) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            commission.status = "approved";
            commission.approvedBy = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
            commission.approvedAt = new Date();
            yield commission.save();
            // Update affiliate balance
            yield model_2.default.findByIdAndUpdate(commission.affiliate, {
                $inc: {
                    "affiliateInfo.currentBalance": commission.commissionAmount,
                    "affiliateInfo.totalEarned": commission.commissionAmount,
                },
            });
        }));
        yield Promise.all(updates);
        res.json({
            success: true,
            message: `${commissions.length} commissions approved successfully`,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});
exports.bulkApproveCommissions = bulkApproveCommissions;
// ============================================================================
// WITHDRAWAL MANAGEMENT CONTROLLERS
// ============================================================================
// Get all withdrawal requests
const getWithdrawals = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { status, page = 1, limit = 10 } = req.query;
        const filter = {};
        if (status)
            filter.status = status;
        const withdrawals = yield model_1.AffiliateWithdrawal.find(filter)
            .populate("affiliate", "name email phone affiliateInfo.affiliateCode")
            .populate("processedBy", "name")
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));
        const total = yield model_1.AffiliateWithdrawal.countDocuments(filter);
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
        const withdrawal = yield model_1.AffiliateWithdrawal.findById(id);
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
        const affiliate = yield model_2.default.findById(withdrawal.affiliate);
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
        yield model_2.default.findByIdAndUpdate(withdrawal.affiliate, {
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
        const withdrawal = yield model_1.AffiliateWithdrawal.findById(id);
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
// ============================================================================
// SETTINGS MANAGEMENT CONTROLLERS - REMOVED
// Settings functionality deleted as it's not being used on server side
