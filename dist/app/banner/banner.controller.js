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
exports.getBannersWithHomePageChecked = exports.updatePagesInBanners = exports.getBannersByBrand = exports.getBannersByCategory = exports.deleteBannerById = exports.getBannerById = exports.getAllBanners = exports.allForAdminIndexPage = exports.singleForEditPage = exports.update = exports.create = void 0;
const banner_model_1 = __importDefault(require("./banner.model")); // Ensure the correct path to the model
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const item = yield banner_model_1.default.create(req.body);
        // Send success message along with the created product data
        res.status(201).json({
            message: "Created successfully!",
            item, // Optionally, include the created product in the response
        });
    }
    catch (error) {
        // Send error message if there was an issue
        res.status(500).json({
            message: "Failed to create.",
            error: error.message,
        });
    }
});
exports.create = create;
// Controller function to update a banner by ID
const update = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const item = yield banner_model_1.default.findByIdAndUpdate(id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!item)
            return res.status(404).json({ message: "Banner not found." });
        res.status(200).json({ message: "Banner updated successfully!", item });
    }
    catch (error) {
        console.error(error);
        res
            .status(500)
            .json({ message: "Failed to update Banner.", error: error.message });
    }
});
exports.update = update;
const singleForEditPage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const item = yield banner_model_1.default.findOne({ _id: req.params.id });
        res.status(200).json({ message: "Banner fetched successfully!", item });
    }
    catch (error) {
        console.error(error);
        res
            .status(500)
            .json({ message: "Failed to fetch Banner.", error: error.message });
    }
});
exports.singleForEditPage = singleForEditPage;
const allForAdminIndexPage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const items = yield banner_model_1.default.find().select("title").sort({ createdAt: -1 });
        res.status(200).json({ message: "Fetched Successfully", items });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.allForAdminIndexPage = allForAdminIndexPage;
const getAllBanners = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const banners = (yield banner_model_1.default.find()).reverse();
        res.status(200).json(banners);
    }
    catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.getAllBanners = getAllBanners;
const getBannerById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const banner = yield banner_model_1.default.findById(req.params.id);
        if (!banner) {
            return res.status(404).json({ error: "Banner not found" });
        }
        res.status(200).json(banner);
    }
    catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.getBannerById = getBannerById;
const deleteBannerById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const bannerId = req.params.id;
        // Find and delete the banner by ID
        const banner = yield banner_model_1.default.findByIdAndDelete(bannerId);
        if (!banner) {
            return res.status(404).json({ error: "Banner not found" });
        }
        // Respond with a success message
        res.status(200).json({ message: "Banner deleted successfully" });
    }
    catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.deleteBannerById = deleteBannerById;
// Controller function to get banners by category
const getBannersByCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const categoryId = req.params.categoryId;
        // Find banners that contain the specified category ID
        const banners = yield banner_model_1.default.find({ category: categoryId });
        res.status(200).json(banners);
    }
    catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.getBannersByCategory = getBannersByCategory;
const getBannersByBrand = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const brandId = req.params.brandId;
        // Find banners that contain the specified category ID
        const banners = yield banner_model_1.default.find({ brands: brandId });
        res.status(200).json(banners);
    }
    catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.getBannersByBrand = getBannersByBrand;
// banners.controller.ts
// Controller function to update the pages field in all banner documents
const updatePagesInBanners = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const newPages = [{ _id: "1", title: "Home", checked: false }];
        // Update the pages field in all banner documents
        yield banner_model_1.default.updateMany({}, { pages: newPages });
        // Optionally, fetch updated banners after update
        const updatedBanners = yield banner_model_1.default.find();
        res.status(200).json(updatedBanners);
    }
    catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.updatePagesInBanners = updatePagesInBanners;
const getBannersWithHomePageChecked = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const banners = yield banner_model_1.default.find({
            "pages.title": "Home",
            "pages.checked": true,
        }).sort({ position: 1 }); // Sort by 'position' in ascending order
        res.status(200).json(banners);
    }
    catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.getBannersWithHomePageChecked = getBannersWithHomePageChecked;
