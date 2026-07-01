import { Router } from "express";
import { uploadImage } from "./controller";
import { verifyUser } from "../../middleware/auth";

const router = Router();

// Fix S-04: upload route is now protected — must be logged in
router.post("/upload", verifyUser, uploadImage);

export default router;
