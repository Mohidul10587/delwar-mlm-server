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
exports.getAffiliateApplicationDetails = exports.rejectAffiliateApplication = exports.approveAffiliateApplication = exports.getAffiliateApplications = void 0;
const model_1 = __importDefault(require("../user/model"));
// Get all affiliate applications by status
const getAffiliateApplications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { status } = req.query;
        const filter = {};
        if (status && status !== "all") {
            filter["affiliateInfo.status"] = status;
        }
        const applications = yield model_1.default.find(filter)
            .select("name email phone affiliateInfo createdAt")
            .sort({ "affiliateInfo.appliedAt": -1 });
        res.json({ applications });
    }
    catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
});
exports.getAffiliateApplications = getAffiliateApplications;
// Approve affiliate application
const approveAffiliateApplication = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { userId } = req.params;
        const adminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const user = yield model_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (user.affiliateInfo.status !== "pending") {
            return res.status(400).json({ message: "Application is not pending" });
        }
        user.affiliateInfo.status = "approved";
        user.affiliateInfo.isActive = true;
        user.affiliateInfo.approvedAt = new Date();
        user.affiliateInfo.approvedBy = adminId;
        yield user.save();
        res.json({
            message: "Affiliate application approved successfully",
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                affiliateInfo: user.affiliateInfo,
            },
        });
    }
    catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
});
exports.approveAffiliateApplication = approveAffiliateApplication;
// Reject affiliate application
const rejectAffiliateApplication = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { userId } = req.params;
        const adminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const user = yield model_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (user.affiliateInfo.status !== "pending") {
            return res.status(400).json({ message: "Application is not pending" });
        }
        user.affiliateInfo.status = "rejected";
        user.affiliateInfo.isActive = false;
        user.affiliateInfo.approvedBy = adminId;
        yield user.save();
        res.json({
            message: "Affiliate application rejected successfully",
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                affiliateInfo: user.affiliateInfo,
            },
        });
    }
    catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
});
exports.rejectAffiliateApplication = rejectAffiliateApplication;
// Get affiliate application details
const getAffiliateApplicationDetails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const user = yield model_1.default.findById(userId)
            .select("name email phone affiliateInfo createdAt")
            .populate("affiliateInfo.approvedBy", "name email");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json({ user });
    }
    catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
});
exports.getAffiliateApplicationDetails = getAffiliateApplicationDetails;
