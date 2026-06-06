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
exports.bulkApproveCommissions = exports.markCommissionPaid = exports.rejectCommission = exports.approveCommission = exports.getCommissions = void 0;
const AffiliateCommission_1 = require("../models/AffiliateCommission");
const model_1 = __importDefault(require("../../user/model"));
// Get all commissions with filters
const getCommissions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { status, affiliate, page = 1, limit = 10 } = req.query;
        const filter = {};
        if (status)
            filter.status = status;
        if (affiliate)
            filter.affiliate = affiliate;
        const commissions = yield AffiliateCommission_1.AffiliateCommission.find(filter)
            .populate("affiliate", "name email affiliateInfo.affiliateCode")
            .populate("product", "title price")
            .populate("order", "orderNumber")
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));
        const total = yield AffiliateCommission_1.AffiliateCommission.countDocuments(filter);
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
        const commission = yield AffiliateCommission_1.AffiliateCommission.findById(id);
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
        yield model_1.default.findByIdAndUpdate(commission.affiliate, {
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
        const commission = yield AffiliateCommission_1.AffiliateCommission.findById(id);
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
        const commission = yield AffiliateCommission_1.AffiliateCommission.findById(id);
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
        yield model_1.default.findByIdAndUpdate(commission.affiliate, {
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
        const commissions = yield AffiliateCommission_1.AffiliateCommission.find({
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
            yield model_1.default.findByIdAndUpdate(commission.affiliate, {
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
