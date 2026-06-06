import { Router } from "express";
import { uploadImage } from "./controller";

const router = Router();

router.post("/upload", uploadImage);

export default router;
