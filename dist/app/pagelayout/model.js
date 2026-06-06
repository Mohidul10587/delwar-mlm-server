"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PageLayout = void 0;
const mongoose_1 = require("mongoose");
const titleSchema = { en: { type: String, required: true }, bn: { type: String, default: "" } };
const sectionSchema = new mongoose_1.Schema({
    type: { type: String, required: true },
    order: { type: Number, required: true },
    titleConfig: {
        text: { en: { type: String, default: "" }, bn: { type: String, default: "" } },
        show: { type: Boolean, default: true },
        align: { type: String, default: "left" },
        desktopSize: { type: String, default: "lg" },
        mobileSize: { type: String, default: "lg" },
        color: { type: String, default: "" },
        bgColor: { type: String, default: "" },
    },
    desktopBanners: [String],
    mobileBanners: [String],
    sideBanner: { type: String, default: "" },
    categories: [{ title: titleSchema, slug: String, img: String }],
    brands: [{ title: titleSchema, slug: String, img: String }],
    images: [String],
    testimonials: [{ text: String, name: String, role: String, avatar: String }],
    title: { en: String, bn: String },
    viewAllHref: { type: String, default: "" },
    category: { type: String, default: "" },
    subCategory: { type: String, default: "" },
    brand: { type: String, default: "" },
    limit: { type: Number, default: 10 },
    productTypes: [{ title: titleSchema, slug: String, image: String }],
}, { _id: false });
const PageLayoutSchema = new mongoose_1.Schema({
    title: titleSchema,
    slug: { type: String, required: true, unique: true },
    sections: [sectionSchema],
}, { timestamps: true });
exports.PageLayout = (0, mongoose_1.model)("PageLayout", PageLayoutSchema);
