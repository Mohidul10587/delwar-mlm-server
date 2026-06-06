"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
const mongoose_1 = __importStar(require("mongoose"));
const counter_1 = require("../shared/counter");
const writerSchema = new mongoose_1.Schema({
    writerId: { type: Number, unique: true },
    title: {
        en: { type: String, required: true },
        bn: { type: String, required: true }
    },
    slug: { type: String, required: true, unique: true },
    description: { type: String },
    img: { type: String, required: true },
    rating: { type: Number, default: 4 },
    metaTitle: { type: String },
    metaDescription: { type: String },
    keywords: { type: [String] },
    metaImg: { type: String },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });
// Auto-increment writerId
writerSchema.pre("save", function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        const doc = this;
        if (doc.isNew) {
            doc.writerId = yield (0, counter_1.getNextSequence)("writerId");
        }
        next();
    });
});
// Helper function to ensure unique slug
const ensureUniqueSlug = (slug, excludeId) => __awaiter(void 0, void 0, void 0, function* () {
    let uniqueSlug = slug;
    let counter = 1;
    const query = excludeId ? { slug: uniqueSlug, _id: { $ne: excludeId } } : { slug: uniqueSlug };
    while (yield mongoose_1.default.models.Writer.exists(query)) {
        uniqueSlug = `${slug}-${counter++}`;
        const newQuery = excludeId ? { slug: uniqueSlug, _id: { $ne: excludeId } } : { slug: uniqueSlug };
        if (!(yield mongoose_1.default.models.Writer.exists(newQuery)))
            break;
    }
    return uniqueSlug;
});
// Middleware for save operations
writerSchema.pre("save", function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const doc = this;
        if (!doc.isModified("slug"))
            return next();
        doc.slug = yield ensureUniqueSlug(doc.slug, (_a = doc._id) === null || _a === void 0 ? void 0 : _a.toString());
        next();
    });
});
// Middleware for findOneAndUpdate operations
writerSchema.pre("findOneAndUpdate", function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        const update = this.getUpdate();
        if (update && update.slug) {
            const docId = this.getQuery()._id;
            update.slug = yield ensureUniqueSlug(update.slug, docId);
        }
        next();
    });
});
const Writer = (0, mongoose_1.model)("Writer", writerSchema);
exports.default = Writer;
