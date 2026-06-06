"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductType = void 0;
const mongoose_1 = require("mongoose");
const ModelSchema = new mongoose_1.Schema({ title: { en: String, bn: String }, slug: String, image: String });
const BrandSchema = new mongoose_1.Schema({ title: { en: String, bn: String }, slug: String, image: String, models: [ModelSchema] });
const SubCategorySchema = new mongoose_1.Schema({ title: { en: String, bn: String }, slug: String, image: String, brands: [BrandSchema] });
const CategorySchema = new mongoose_1.Schema({ title: { en: String, bn: String }, slug: String, image: String, subCategories: [SubCategorySchema] });
const ProductTypeSchema = new mongoose_1.Schema({
    title: { en: { type: String, required: true }, bn: String },
    slug: { type: String, required: true, unique: true },
    image: String,
    categories: [CategorySchema],
}, { timestamps: true });
exports.ProductType = (0, mongoose_1.model)("ProductType", ProductTypeSchema);
