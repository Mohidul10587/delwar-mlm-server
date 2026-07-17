"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Category = void 0;
const mongoose_1 = require("mongoose");
const slugify_1 = __importDefault(require("slugify"));
const CategorySchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    image: { type: String, default: null },
    order: { type: Number, default: 0 },
    slug: { type: String, unique: true, sparse: true },
}, { timestamps: true });
// Auto-generate slug from title before saving
CategorySchema.pre("save", function (next) {
    if (this.isModified("title") || !this.slug) {
        this.slug = (0, slugify_1.default)(this.title, { lower: true, strict: true });
    }
    next();
});
// Index for fast ordered queries and slug lookups
CategorySchema.index({ order: 1 });
CategorySchema.index({ slug: 1 });
exports.Category = (0, mongoose_1.model)("Category", CategorySchema);
