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
exports.allSubcategoriesForAdminSubCatIndexPage = exports.update = exports.singleForEditPage = exports.create = void 0;
const subcategory_model_1 = __importDefault(require("./subcategory.model"));
const generateSLug_1 = require("../shared/generateSLug");
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const item = yield subcategory_model_1.default.create(Object.assign(Object.assign({}, req.body), { slug: (0, generateSLug_1.generateSlug)(req.body.title) }));
        // Send success message along with the created category data
        res.status(201).json({
            message: "Subcategory created successfully!",
            item,
        });
    }
    catch (error) {
        // Send error message if there was an issue
        res.status(500).json({
            message: "Failed to create subcategory.",
            error: error.message,
        });
    }
});
exports.create = create;
const singleForEditPage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const item = yield subcategory_model_1.default.findOne({ _id: req.params.id });
        res
            .status(200)
            .json({ message: "Subcategory fetched successfully!", item });
    }
    catch (error) {
        console.error(error);
        res
            .status(500)
            .json({ message: "Failed to fetch subcategory.", error: error.message });
    }
});
exports.singleForEditPage = singleForEditPage;
// Update
const update = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const item = yield subcategory_model_1.default.findByIdAndUpdate(id, req.body, {
            new: true, // Return the updated document
            runValidators: true, // Run validation on the updated data
        });
        if (!item) {
            return res.status(404).json({
                message: "Not found.",
            });
        }
        res.status(200).json({
            message: "Subcategory Updated successfully!",
            item,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to update subcategory.",
            error: error.message,
        });
    }
});
exports.update = update;
// Get all
const allSubcategoriesForAdminSubCatIndexPage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const items = yield subcategory_model_1.default.find().select("title slug img");
        res.status(200).json({
            message: "Fetched successfully!",
            respondedData: items.reverse(),
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to fetch.",
            error: error.message,
        });
    }
});
exports.allSubcategoriesForAdminSubCatIndexPage = allSubcategoriesForAdminSubCatIndexPage;
