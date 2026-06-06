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
exports.toggleAffiliateStatus = exports.rejectAffiliate = exports.approveAffiliate = exports.getAffiliateDetails = exports.getAffiliates = void 0;
const model_1 = __importDefault(require("../../user/model"));
const AffiliateCommission_1 = require("../models/AffiliateCommission");
const AffiliateWithdrawal_1 = require("../models/AffiliateWithdrawal");
const generateCode_1 = require("../../shared/generateCode");
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
        const affiliates = yield model_1.default.find(filter)
            .select("name email phone affiliateInfo createdAt")
            .sort({ "affiliateInfo.appliedAt": -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));
        const total = yield model_1.default.countDocuments(filter);
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
        const affiliate = yield model_1.default.findById(id).select("-password");
        if (!affiliate) {
            return res
                .status(404)
                .json({ success: false, message: "Affiliate not found" });
        }
        const commissions = yield AffiliateCommission_1.AffiliateCommission.find({ affiliate: id })
            .populate("product", "title price")
            .populate("order", "orderNumber")
            .sort({ createdAt: -1 })
            .limit(20);
        const withdrawals = yield AffiliateWithdrawal_1.AffiliateWithdrawal.find({ affiliate: id })
            .sort({ createdAt: -1 })
            .limit(10);
        const stats = yield AffiliateCommission_1.AffiliateCommission.aggregate([
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
        const affiliate = yield model_1.default.findById(id);
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
        const affiliate = yield model_1.default.findById(id);
        if (!affiliate) {
            return res
                .status(404)
                .json({ success: false, message: "User not found" });
        }
        affiliate.affiliateInfo.status = "blocked";
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
        const affiliate = yield model_1.default.findById(id);
        if (!affiliate) {
            return res
                .status(404)
                .json({ success: false, message: "User not found" });
        }
        affiliate.affiliateInfo.isActive = !affiliate.affiliateInfo.isActive;
        if (!affiliate.affiliateInfo.isActive) {
            affiliate.affiliateInfo.status = "blocked";
        }
        else if (affiliate.affiliateInfo.status === "blocked") {
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
