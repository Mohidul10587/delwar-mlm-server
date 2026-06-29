import { Router } from "express";
import {
  createShare,
  getShares,
  getShareById,
  updateShare,
  deleteShare,
  getShareStats,
  getSharesWithStats,
} from "./controller";
import { verifySuperAdmin, verifyStaff } from "../../middleware/auth";

const router = Router();

router.get("/", getShares);
router.get("/stats", verifyStaff, getShareStats);
router.get("/with-stats", verifyStaff, getSharesWithStats);
router.get("/:id", getShareById);
router.post("/", verifySuperAdmin, createShare);
router.put("/:id", verifySuperAdmin, updateShare);
router.delete("/:id", verifySuperAdmin, deleteShare);

export default router;
