import { Router } from "express";
import { getPublicSettings, getSettings, updateSettings } from "./controller";
import { verifySuperAdmin, verifyAdmin } from "../../middleware/auth";

const router = Router();

router.get("/public", getPublicSettings);       // H-02: public safe fields only
router.get("/", verifyAdmin, getSettings);      // H-02: full settings requires admin
router.put("/", verifySuperAdmin, updateSettings);

export default router;
