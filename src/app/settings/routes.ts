import { Router } from "express";
import { getSettings, updateSettings } from "./controller";
import { verifySuperAdmin } from "../../middleware/auth";

const router = Router();
router.get("/", getSettings);
router.put("/", verifySuperAdmin, updateSettings);

export default router;
