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
exports.updateDefaultSellerStatus = exports.update = exports.getPrivacyPoliciesOfSettings = exports.getSettings = void 0;
const cloudinary_config_1 = __importDefault(require("../shared/cloudinary.config"));
const settings_model_1 = __importDefault(require("./settings.model"));
const uploadToCloudinary = (file) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary_config_1.default.uploader.upload_stream((error, result) => {
            if (error) {
                return reject(error);
            }
            resolve(result);
        });
        stream.end(file.buffer);
    });
};
const getSettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const item = yield settings_model_1.default.findOne();
        if (!item) {
            res.status(404).json({ message: "Settings not found" });
            return;
        }
        res.status(200).json({ message: "Settings not found", item });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getSettings = getSettings;
const getPrivacyPoliciesOfSettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const settings = yield settings_model_1.default.findOne();
        if (!settings) {
            res.status(404).json({ message: "Settings not found" });
            return;
        }
        res.status(200).json(settings.privacyPolicies);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getPrivacyPoliciesOfSettings = getPrivacyPoliciesOfSettings;
const update = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const item = yield settings_model_1.default.findByIdAndUpdate(id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!item)
            return res.status(404).json({ message: "Product not found." });
        res.status(200).json({ message: "Product updated successfully!", item });
    }
    catch (error) {
        console.error(error);
        res
            .status(500)
            .json({ message: "Failed to update Product.", error: error.message });
    }
});
exports.update = update;
const updateDefaultSellerStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params; // Extract the ID from request parameters
        const { status } = req.body; // Extract the status from request body
        // Validate that status is provided
        if (status === undefined) {
            return res
                .status(400)
                .json({ message: "Missing required field: status" });
        }
        // Find the document by ID and update the 'sellerDefaultStatus' field
        const result = yield settings_model_1.default.findByIdAndUpdate(id, // Match the document by ID
        { sellerDefaultStatus: status }, // Update only the 'sellerDefaultStatus' field
        { new: true, runValidators: true } // Return the updated document and validate input
        );
        if (!result) {
            return res
                .status(404)
                .json({ message: "No settings document found with the provided ID" });
        }
        res.status(200).json({
            message: "Default seller status updated successfully",
            data: result,
        });
    }
    catch (error) {
        res.status(500).json({
            message: "Error updating Default seller status",
            error: error.message,
        });
    }
});
exports.updateDefaultSellerStatus = updateDefaultSellerStatus;
