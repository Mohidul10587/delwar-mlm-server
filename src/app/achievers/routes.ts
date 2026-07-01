import { Router } from "express";
import { getAchievers } from "./controller";

const router = Router();

// Public endpoint — no auth required (shown on the public home page)
router.get("/", getAchievers);

export default router;
