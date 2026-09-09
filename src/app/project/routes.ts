import { Router } from "express";
import {
  createShare,
  getShares,
  getSharesAdmin,
  getShareById,
  updateShare,
  deleteShare,
  getShareStats,
  getProjectsWithStats,
  getCoverSlider,
  setCoverSlider,
  unsetCoverSlider,
  backfillSlots,
  checkSharePrefix,
  uploadProjectLogo,
  searchShares,
} from "./controller";
import { verifySuperAdmin, verifyStaff } from "../../middleware/auth";

const router = Router();

// Static/named routes must come before /:id to avoid being swallowed by the param
router.get("/cover-slider", getCoverSlider);
router.get("/stats", verifyStaff, getShareStats);
router.get("/with-stats", verifyStaff, getProjectsWithStats);
router.get("/admin/all", verifyStaff, getSharesAdmin);
router.get("/check-prefix/:prefix", verifyStaff, checkSharePrefix);

// Public search & filter — must be before /:id
router.get("/search", searchShares);

// Public routes (user-facing) — only active shares
router.get("/", getShares);
router.get("/:id", getShareById);

// Mutating routes
router.post("/", verifySuperAdmin, createShare);
router.put("/:id", verifySuperAdmin, updateShare);
router.delete("/:id", verifySuperAdmin, deleteShare);

// Cover slider management
router.patch("/:id/set-cover-slider", verifyStaff, setCoverSlider);
router.patch("/:id/unset-cover-slider", verifyStaff, unsetCoverSlider);

// Project logo upload — used on certificates
router.patch("/:id/logo", verifySuperAdmin, uploadProjectLogo);

// Slot backfill — for shares that existed before slot system was introduced
router.post("/:id/backfill-slots", verifySuperAdmin, backfillSlots);

export default router;
