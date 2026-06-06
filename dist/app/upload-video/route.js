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
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const cloudinary_1 = require("cloudinary");
const router = (0, express_1.Router)();
/* ---------------- CLOUDINARY CONFIG ---------------- */
cloudinary_1.v2.config({
    cloud_name: "dr9az74sd",
    api_key: "243991651923286",
    api_secret: "gNrIxiD_CD0MLykESs7CSY_qddQ",
});
/* ---------------- MULTER CONFIG ---------------- */
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // ✅ 50MB
    },
    fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith("video/")) {
            cb(new Error("Only video files are allowed"));
        }
        else {
            cb(null, true);
        }
    },
});
/* ---------------- ROUTE ---------------- */
router.post("/upload/video", upload.single("file"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file provided" });
        }
        console.log("Incoming file:", {
            name: req.file.originalname,
            size: req.file.size,
            type: req.file.mimetype,
        });
        const uploadResult = yield new Promise((resolve, reject) => {
            var _a;
            cloudinary_1.v2.uploader
                .upload_stream({
                folder: "videos",
                resource_type: "video",
                access_mode: "public",
            }, (error, result) => {
                if (error)
                    reject(error);
                else
                    resolve(result);
            })
                .end((_a = req.file) === null || _a === void 0 ? void 0 : _a.buffer);
        });
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        return res.json({
            url: uploadResult.secure_url,
            resourceType: uploadResult.resource_type,
            size: uploadResult.bytes,
        });
    }
    catch (error) {
        console.error("Upload error:", error);
        return res.status(500).json({
            error: error.message || "Video upload failed",
        });
    }
}));
exports.default = router;
