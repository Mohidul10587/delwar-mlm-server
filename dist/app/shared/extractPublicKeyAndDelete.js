"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractPublicKeyAndDelete = extractPublicKeyAndDelete;
const cloudinary_config_1 = __importDefault(require("./cloudinary.config"));
function extractPublicKeyAndDelete(url) {
    return new Promise((resolve, reject) => {
        try {
            // Trim the URL to remove trailing quotes or whitespace
            url = url.trim();
            // Find the last occurrence of "/" and "."
            const lastSlashIndex = url.lastIndexOf("/");
            const lastDotIndex = url.lastIndexOf(".");
            // Allowed extensions
            const validExtensions = ["jpg", "jpeg", "svg", "png", "webp"];
            // Extract the extension
            const extension = url.substring(lastDotIndex + 1).toLowerCase();
            // Validate the format and extension
            if (lastSlashIndex !== -1 &&
                lastDotIndex !== -1 &&
                lastDotIndex > lastSlashIndex &&
                validExtensions.includes(extension) &&
                url.length === lastDotIndex + extension.length + 1 // Ensure no extra characters after the extension
            ) {
                // Extract the public key
                const publicKey = url.substring(lastSlashIndex + 1, lastDotIndex);
                // Call Cloudinary to delete the image
                cloudinary_config_1.default.uploader
                    .destroy(publicKey, { invalidate: true })
                    .then((result) => {
                    if (result.result === "ok") {
                        resolve("Image deleted successfully");
                    }
                    else {
                        reject("Failed to delete the image");
                    }
                })
                    .catch((error) => {
                    console.error("Error during deletion:", error);
                    reject("Failed to delete the image");
                });
            }
            else {
                throw new Error("Invalid URL format or unsupported file extension");
            }
        }
        catch (error) {
            console.error("Error extracting public key:", error.message);
            reject("Error extracting public key");
        }
    });
}
