import { Router, Request, Response } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";

const router = Router();

/* ---------------- CLOUDINARY CONFIG ---------------- */
cloudinary.config({
  cloud_name: "dr9az74sd",
  api_key: "243991651923286",
  api_secret: "gNrIxiD_CD0MLykESs7CSY_qddQ",
});

/* ---------------- MULTER CONFIG ---------------- */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // ✅ 50MB
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("video/")) {
      cb(new Error("Only video files are allowed"));
    } else {
      cb(null, true);
    }
  },
});

/* ---------------- ROUTE ---------------- */
router.post(
  "/upload/video",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
      }

      console.log("Incoming file:", {
        name: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype,
      });

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
      console.error("Upload error:", error);
      return res.status(500).json({
        error: error.message || "Video upload failed",
      });
    }
  }
);

export default router;
