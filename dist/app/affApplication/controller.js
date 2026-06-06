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
exports.getAffiliateProducts = exports.generateAffiliateLink = exports.dashboard = exports.deleteApplication = exports.reject = exports.approve = exports.getApplications = exports.getStatus = exports.apply = void 0;
const model_1 = require("./model");
const model_2 = __importDefault(require("../user/model"));
const model_3 = __importDefault(require("../product/model"));
const apply = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const data = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const existingApplication = yield model_1.AffApplication.findOne({
            user: userId,
        });
        if (existingApplication) {
            return res.status(400).json({ message: "Application already exists" });
        }
        const application = new model_1.AffApplication(Object.assign({ user: userId }, data));
        yield application.save();
        res.status(201).json({ message: "Application submitted successfully" });
    }
    catch (error) {
        console.log(error);
        // 🔹 affiliateCode duplicate হলে
        if (error.code === 11000 && ((_b = error.keyPattern) === null || _b === void 0 ? void 0 : _b.affiliateCode)) {
            return res.status(409).json({
                message: "Affiliate code already exists, please give an unique code",
            });
        }
        res.status(500).json({ message: "Server error" });
    }
});
exports.apply = apply;
const getStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const application = yield model_1.AffApplication.findOne({ user: userId });
        res.json({ application });
    }
    catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});
exports.getStatus = getStatus;
const getApplications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { status } = req.query;
        const applications = yield model_1.AffApplication.find({ status })
            .populate("user", "name email phone")
            .sort({ createdAt: -1 });
        res.json(applications || []);
    }
    catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});
exports.getApplications = getApplications;
const approve = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const adminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const application = yield model_1.AffApplication.findById(id);
        if (!application) {
            return res.status(404).json({ message: "Application not found" });
        }
        // Generate affiliate code
        const affiliateCode = `AFF${Date.now()}`;
        application.status = "approved";
        application.approvedAt = new Date();
        application.approvedBy = adminId;
        yield application.save();
        // Update user's affiliate info
        yield model_2.default.findByIdAndUpdate(application.user, {
            "affiliateInfo.status": "approved",
            "affiliateInfo.affiliateCode": affiliateCode,
            "affiliateInfo.isActive": true,
        });
        res.json({ message: "Application approved successfully" });
    }
    catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});
exports.approve = approve;
const reject = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const adminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const application = yield model_1.AffApplication.findByIdAndUpdate(id, {
            status: "rejected",
            approvedAt: new Date(),
            approvedBy: adminId,
        }, { new: true });
        if (!application) {
            return res.status(404).json({ message: "Application not found" });
        }
        res.json({ message: "Application rejected successfully" });
    }
    catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});
exports.reject = reject;
const deleteApplication = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const application = yield model_1.AffApplication.findByIdAndDelete(id);
        if (!application) {
            return res.status(404).json({ message: "Application not found" });
        }
        res.json({ message: "Application deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});
exports.deleteApplication = deleteApplication;
// Get affiliate dashboard data
const dashboard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const user = yield model_2.default.findById(userId).select("affiliateInfo");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (!user.affiliateInfo) {
            return res
                .status(404)
                .json({ message: "No affiliate application found" });
        }
        if (user.affiliateInfo.status === "pending") {
            return res.status(403).json({ message: "Affiliate application pending" });
        }
        if (user.affiliateInfo.status === "rejected") {
            return res
                .status(403)
                .json({ message: "Affiliate application rejected" });
        }
        if (!user.affiliateInfo.isActive) {
            return res.status(404).json({ message: "Affiliate not active" });
        }
        res.json({ affiliateInfo: user.affiliateInfo });
    }
    catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
});
exports.dashboard = dashboard;
// Generate affiliate link
const generateAffiliateLink = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { productId } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const user = yield model_2.default.findById(userId).select("affiliateInfo");
        if (!user || !((_b = user.affiliateInfo) === null || _b === void 0 ? void 0 : _b.isActive)) {
            return res.status(403).json({ message: "Affiliate not active" });
        }
        const affiliateLink = `${process.env.FRONTEND_URL}/affiliate/${productId}?ref=${user.affiliateInfo.affiliateCode}`;
        res.json({ affiliateLink });
    }
    catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
});
exports.generateAffiliateLink = generateAffiliateLink;
const getAffiliateProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const search = req.query.search || "";
        const skip = (page - 1) * limit;
        const query = {
            affiliateEnabled: true,
            display: true,
            isEnabledByAdmin: true,
        };
        if (search) {
            query.$or = [
                { "title.en": { $regex: search, $options: "i" } },
                { "title.bn": { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
                { shortDescription: { $regex: search, $options: "i" } },
            ];
        }
        const products = yield model_3.default.find(query)
            .select("title img sellingPrice regularPrice affiliateCommission affiliateCommissionType slug existingQnt")
            .populate("writer", "title")
            .populate("category", "title")
            .populate("seller", "sellerInfo.companyName")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        const totalProducts = yield model_3.default.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / limit);
        res.json({
            success: true,
            products,
            pagination: {
                currentPage: page,
                totalPages,
                totalProducts,
                productsPerPage: limit,
                hasNext: page < totalPages,
                hasPrev: page > 1,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});
exports.getAffiliateProducts = getAffiliateProducts;
