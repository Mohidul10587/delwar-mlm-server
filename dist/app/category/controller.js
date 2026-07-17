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
exports.reorderCategories = exports.deleteCategory = exports.updateCategory = exports.createCategory = exports.getCategoryProjects = exports.getCategoryBySlug = exports.getCategories = void 0;
const cloudinary_1 = require("cloudinary");
const slugify_1 = __importDefault(require("slugify"));
const dotenv_1 = __importDefault(require("dotenv"));
const model_1 = require("./model");
const model_2 = require("../project/model");
dotenv_1.default.config();
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
// ─── Helpers ──────────────────────────────────────────────────────────────────
/** Extract Cloudinary public_id from a secure_url */
function extractPublicId(url) {
    try {
        const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-z]+)?$/i);
        return match ? match[1] : null;
    }
    catch (_a) {
        return null;
    }
}
/** Delete a Cloudinary image by URL (best-effort, never throws) */
function deleteCloudinaryImage(imageUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const publicId = extractPublicId(imageUrl);
            if (publicId) {
                yield cloudinary_1.v2.uploader.destroy(publicId);
            }
        }
        catch (_a) {
            // Silently ignore; deletion failure should not block the API response
        }
    });
}
/**
 * Generate a unique slug for the given title.
 * Appends a numeric suffix if the base slug is already taken (excluding the
 * current document when updating).
 */
function generateUniqueSlug(title, excludeId) {
    return __awaiter(this, void 0, void 0, function* () {
        const base = (0, slugify_1.default)(title, { lower: true, strict: true });
        let candidate = base;
        let counter = 1;
        while (true) {
            const query = { slug: candidate };
            if (excludeId)
                query._id = { $ne: excludeId };
            const exists = yield model_1.Category.exists(query);
            if (!exists)
                return candidate;
            candidate = `${base}-${counter}`;
            counter++;
        }
    });
}
// ─── GET /category ────────────────────────────────────────────────────────────
const getCategories = (_req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const categories = yield model_1.Category.find()
            .sort({ order: 1, createdAt: 1 })
            .lean();
        res.json({ categories });
    }
    catch (err) {
        next(err);
    }
});
exports.getCategories = getCategories;
// ─── GET /category/by-slug/:slug ─────────────────────────────────────────────
const getCategoryBySlug = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const category = yield model_1.Category.findOne({
            slug: req.params.slug,
        }).lean();
        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }
        res.json({ category });
    }
    catch (err) {
        next(err);
    }
});
exports.getCategoryBySlug = getCategoryBySlug;
// ─── GET /category/by-slug/:slug/projects ─────────────────────────────────────
const getCategoryProjects = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const category = yield model_1.Category.findOne({
            slug: req.params.slug,
        })
            .select("_id title slug image")
            .lean();
        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }
        // Only active projects for public display, ordered by createdAt desc
        const projects = yield model_2.Project.find({
            categoryId: String(category._id),
            isActive: true,
        })
            .sort({ createdAt: -1 })
            .lean();
        res.json({ category, projects });
    }
    catch (err) {
        next(err);
    }
});
exports.getCategoryProjects = getCategoryProjects;
// ─── POST /category ───────────────────────────────────────────────────────────
const createCategory = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const maxDoc = yield model_1.Category.findOne()
            .sort({ order: -1 })
            .select("order")
            .lean();
        const nextOrder = maxDoc ? maxDoc.order + 1 : 0;
        // Generate unique slug from provided title
        const slug = yield generateUniqueSlug(req.body.title);
        const category = yield model_1.Category.create(Object.assign(Object.assign({}, req.body), { order: nextOrder, slug }));
        res.status(201).json({ message: "Category created", category });
    }
    catch (err) {
        next(err);
    }
});
exports.createCategory = createCategory;
// ─── PUT /category/:id ────────────────────────────────────────────────────────
const updateCategory = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const existing = yield model_1.Category.findById(req.params.id);
        if (!existing) {
            return res.status(404).json({ message: "Category not found" });
        }
        // Rebuild slug only when the title actually changes
        let newSlug = existing.slug;
        if (req.body.title && req.body.title !== existing.title) {
            newSlug = yield generateUniqueSlug(req.body.title, req.params.id);
        }
        // Image cleanup
        const incomingImage = req.body.image;
        const isRemovingImage = (incomingImage === null || incomingImage === "") && existing.image;
        if (isRemovingImage && existing.image) {
            yield deleteCloudinaryImage(existing.image);
        }
        if (incomingImage &&
            existing.image &&
            incomingImage !== existing.image) {
            yield deleteCloudinaryImage(existing.image);
        }
        const category = yield model_1.Category.findByIdAndUpdate(req.params.id, { $set: Object.assign(Object.assign({}, req.body), { slug: newSlug }) }, { new: true });
        res.json({ message: "Category updated", category });
    }
    catch (err) {
        next(err);
    }
});
exports.updateCategory = updateCategory;
// ─── DELETE /category/:id ─────────────────────────────────────────────────────
const deleteCategory = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const category = yield model_1.Category.findByIdAndDelete(req.params.id);
        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }
        if (category.image) {
            yield deleteCloudinaryImage(category.image);
        }
        res.json({ message: "Category deleted" });
    }
    catch (err) {
        next(err);
    }
});
exports.deleteCategory = deleteCategory;
// ─── PATCH /category/reorder ─────────────────────────────────────────────────
const reorderCategories = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { items } = req.body;
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: "items array is required" });
        }
        for (const item of items) {
            if (!item.id || typeof item.order !== "number") {
                return res
                    .status(400)
                    .json({ message: "Each item must have id and order (number)" });
            }
        }
        const bulkOps = items.map(({ id, order }) => ({
            updateOne: {
                filter: { _id: id },
                update: { $set: { order } },
            },
        }));
        yield model_1.Category.bulkWrite(bulkOps);
        res.json({ message: "Categories reordered successfully" });
    }
    catch (err) {
        next(err);
    }
});
exports.reorderCategories = reorderCategories;
