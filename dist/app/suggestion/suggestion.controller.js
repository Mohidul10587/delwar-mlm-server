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
exports.update = exports.deleteSuggestion = exports.create = exports.getSuggestionById = exports.singleForEditPage = exports.getAllSuggestions = exports.allForAdminIndexPage = void 0;
const suggestion_model_1 = __importDefault(require("./suggestion.model"));
const allForAdminIndexPage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const items = yield suggestion_model_1.default.find()
            .select("title")
            .sort({ createdAt: -1 });
        res.status(200).json({ message: "Fetched Successfully", items });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.allForAdminIndexPage = allForAdminIndexPage;
// Get all suggestions
const getAllSuggestions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const suggestions = yield suggestion_model_1.default.find().populate({
            path: "products",
            select: "_id title sellingPrice photo",
        });
        if (suggestions.length === 0) {
            res.status(200).json({ suggestions, message: "Suggestions not found" });
            return;
        }
        res
            .status(200)
            .json({ suggestions, message: "Suggestions Fetched successfully" });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getAllSuggestions = getAllSuggestions;
const singleForEditPage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const item = yield suggestion_model_1.default.findOne({ _id: req.params.id });
        res.status(200).json({ message: "Suggestion fetched successfully!", item });
    }
    catch (error) {
        console.error(error);
        res
            .status(500)
            .json({ message: "Failed to fetch Suggestion.", error: error.message });
    }
});
exports.singleForEditPage = singleForEditPage;
// Get a single suggestion by ID
const getSuggestionById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const suggestion = yield suggestion_model_1.default.findById(id).populate({
            path: "products",
            select: "_id title sellingPrice photo shippingInside shippingOutside",
        });
        if (!suggestion) {
            res.status(404).json({ message: "Suggestion not found" });
            return;
        }
        res.status(200).json(suggestion);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getSuggestionById = getSuggestionById;
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const item = yield suggestion_model_1.default.create(req.body);
        // Send success message along with the created product data
        res.status(201).json({
            message: "Suggestion Created successfully!",
            item, // Optionally, include the created product in the response
        });
    }
    catch (error) {
        // Send error message if there was an issue
        res.status(500).json({
            message: "Failed to create suggestion.",
            error: error.message,
        });
    }
});
exports.create = create;
// Delete a suggestion by ID
const deleteSuggestion = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const deletedSuggestion = yield suggestion_model_1.default.findByIdAndDelete(id);
        if (!deletedSuggestion) {
            res.status(404).json({ message: "Suggestion not found" });
            return;
        }
        res.status(200).json({ message: "Suggestion deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.deleteSuggestion = deleteSuggestion;
// Update
const update = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const updatedItem = yield suggestion_model_1.default.findByIdAndUpdate(id, req.body, {
            new: true, // Return the updated document
            runValidators: true, // Run validation on the updated data
        });
        if (!updatedItem) {
            return res.status(404).json({
                message: "Not found.",
            });
        }
        res.status(200).json({
            message: "Updated successfully!",
            respondedData: updatedItem,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to update.",
            error: error.message,
        });
    }
});
exports.update = update;
