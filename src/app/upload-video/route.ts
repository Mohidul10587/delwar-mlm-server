import { Router, Request, Response } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { verifyAdmin } from "../../middleware/auth";
import dotenv from "dotenv";
dotenv.config();
// Fix S-02: use env vars — NOT hardcoded credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("video/")) {
      cb(new Error("Only video files are allowed"));
    } else {
      cb(null, true);
    }
  },
});

const router = Router();

// Fix S-04: protected — only admin can upload videos
router.post(
  "/upload/video",
  verifyAdmin,
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
      }

      const uploadResult: any = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: "videos",
              resource_type: "video",
              access_mode: "public",
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          )
          .end(req.file?.buffer);
      });

      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

      return res.json({
        url: uploadResult.secure_url,
        resourceType: uploadResult.resource_type,
        size: uploadResult.bytes,
      });
    } catch (error: any) {
      return res.status(500).json({
        error: "Video upload failed",
      });
    }
  }
);

export default router;
