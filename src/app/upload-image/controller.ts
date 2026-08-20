import { Request, Response, NextFunction } from "express";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import dotenv from "dotenv";
dotenv.config();
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Fix S-09: file size limit + mime type filter
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
    ];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only JPEG, PNG, WebP and GIF images are allowed"));
    }
    cb(null, true);
  },
});

export const uploadImage = [
  // Parse multipart form and handle multer errors in one middleware
  (req: Request, res: Response, next: NextFunction) => {
    upload.single("file")(req, res, (error: any) => {
      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            message: "File size must not exceed 5 MB",
          });
        }
        return res.status(400).json({
          message: error.message,
        });
      }

      if (error) {
        return res.status(400).json({
          message: error.message,
        });
      }

      next();
    });
  },
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      if (req.file.size > 5 * 1024 * 1024) {
        return res.status(400).json({ message: "File size must not exceed 5 MB" });
      }

      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { resource_type: "image" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(req.file!.buffer);
      });

      res.json({ url: (result as any).secure_url });
    } catch (error) {
      next(error);
    }
  },
];
