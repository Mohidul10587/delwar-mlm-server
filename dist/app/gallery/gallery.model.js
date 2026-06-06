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
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
// Create Meta Schema
const GallerySchema = new mongoose_1.Schema({
    title: { type: String, required: true }, // Title is now required
    img: { type: String, required: true }, // Image is now required
    useCase: {
        type: String,
        enum: [
            "product",
            "category",
            "subcategory",
            "childCategory",
            "brand",
            "logo",
            "banner",
            "popup",
            "others",
        ],
        required: true,
        default: "others", // useCase is now required
    },
}, {
    timestamps: true, // Automatically add createdAt and updatedAt
});
// Export the model
const Gallery = mongoose_1.default.model("Gallery", GallerySchema);
exports.default = Gallery;
