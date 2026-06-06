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
exports.rejectByAdmin = exports.singleForUserForDetailsPageBySlug = exports.singleForAdmin = exports.allForAdminIndexPage = exports.update = exports.create = void 0;
const model_1 = require("./model");
//===================== Admin Controllers =====================
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const item = yield model_1.SellerApplication.create(req.body);
        res
            .status(201)
            .json({ message: "SellerApplication created successfully!", item });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to create SellerApplication.",
            error: error.message,
        });
    }
});
exports.create = create;
const update = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const item = yield model_1.SellerApplication.findByIdAndUpdate(id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!item)
            return res.status(404).json({ message: "SellerApplication not found." });
        res
            .status(200)
            .json({ message: "SellerApplication updated successfully!", item });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to update SellerApplication.",
            error: error.message,
        });
    }
});
exports.update = update;
const allForAdminIndexPage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Pagination params
        const { page = 1, limit = 20, status, } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        // ---------- FILTER ----------
        const filter = {};
        if (status) {
            filter.status = status; // Filter by enum status
        }
        // ---------- QUERY ----------
        const items = yield model_1.SellerApplication.find(filter)
            .populate("user", "name username email phone image")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));
        const totalItems = yield model_1.SellerApplication.countDocuments(filter);
        return res.status(200).json({
            success: true,
            page: Number(page),
            limit: Number(limit),
            totalItems,
            totalPages: Math.ceil(totalItems / Number(limit)),
            items,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Failed to fetch SellerApplications.",
            error: error.message,
        });
    }
});
exports.allForAdminIndexPage = allForAdminIndexPage;
const singleForAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const item = yield model_1.SellerApplication.findOne({ _id: req.params.id }).populate("user", "name username email phone image");
        res.status(200).json(item);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to fetch SellerApplication.",
            error: error.message,
        });
    }
});
exports.singleForAdmin = singleForAdmin;
// ================== User Controllers ======================
const singleForUserForDetailsPageBySlug = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const item = yield model_1.SellerApplication.findOne({ slug: req.params.slug });
        if (!item) {
            return res
                .status(404)
                .json({ message: "Oops! SellerApplication not found.", item: null });
        }
        res.status(200).json(item);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to fetch SellerApplication.",
            error: error.message,
        });
    }
});
exports.singleForUserForDetailsPageBySlug = singleForUserForDetailsPageBySlug;
const rejectByAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Find application
        const application = yield model_1.SellerApplication.findById(id);
        if (!application) {
            return res.status(404).json({ message: "Application not found" });
        }
        application.status = "rejected";
        yield application.save();
        return res.json({
            message: `Application rejected successfully`,
            application,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.rejectByAdmin = rejectByAdmin;
