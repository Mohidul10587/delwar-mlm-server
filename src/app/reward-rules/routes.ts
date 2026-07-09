import { Router } from "express";
import {
  getRewardRules,
  getPublicRewardRules,
  addRewardRule,
  updateRewardRule,
  deleteRewardRule,
} from "./controller";
import { verifySuperAdmin, verifyAdmin } from "../../middleware/auth";

const router = Router();

// Public — active rules for frontend display (no auth required)
router.get("/public", getPublicRewardRules);

// Admin — view all rules (active + inactive)
router.get("/", verifyAdmin, getRewardRules);

// SuperAdmin — create, update, delete rules
router.post("/", verifySuperAdmin, addRewardRule);
router.put("/:targetAmount", verifySuperAdmin, updateRewardRule);
router.delete("/:targetAmount", verifySuperAdmin, deleteRewardRule);

export default router;
