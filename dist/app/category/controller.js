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
exports.deleteCategory = exports.updateCategory = exports.createCategory = exports.getCategories = void 0;
const model_1 = require("./model");
const getCategories = (_req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const categories = yield model_1.Category.find().sort({ createdAt: -1 }).lean();
        res.json({ categories });
    }
    catch (err) {
        next(err);
    }
});
exports.getCategories = getCategories;
const createCategory = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const category = yield model_1.Category.create(req.body);
        res.status(201).json({ message: "Category created", category });
    }
    catch (err) {
        next(err);
    }
});
exports.createCategory = createCategory;
const updateCategory = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const category = yield model_1.Category.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
        if (!category)
            return res.status(404).json({ message: "Category not found" });
        res.json({ message: "Category updated", category });
    }
    catch (err) {
        next(err);
    }
});
exports.updateCategory = updateCategory;
const deleteCategory = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const category = yield model_1.Category.findByIdAndDelete(req.params.id);
        if (!category)
            return res.status(404).json({ message: "Category not found" });
        res.json({ message: "Category deleted" });
    }
    catch (err) {
        next(err);
    }
});
exports.deleteCategory = deleteCategory;
