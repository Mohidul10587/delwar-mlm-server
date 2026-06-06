"use strict";
// Helper function to handle Cloudinary uploads
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
exports.uploadMiddleware = exports.cloudinaryUpload = void 0;
const multer_1 = __importDefault(require("multer"));
const cloudinary_config_1 = __importDefault(require("./cloudinary.config"));
// Helper function to handle Cloudinary uploads
const cloudinaryUpload = (file) => __awaiter(void 0, void 0, void 0, function* () {
    if (!file)
        return "";
    return new Promise((resolve, reject) => {
        cloudinary_config_1.default.uploader
            .upload_stream({ resource_type: "image" }, (error, result) => {
            if (error)
                reject(error);
            else
                resolve((result === null || result === void 0 ? void 0 : result.secure_url) || "");
        })
            .end(file.buffer);
    });
});
exports.cloudinaryUpload = cloudinaryUpload;
// Multer configuration for file uploads (image validation)
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() }); // Store files in memory
// Middleware for handling both single and multiple file uploads
exports.uploadMiddleware = upload.any();
