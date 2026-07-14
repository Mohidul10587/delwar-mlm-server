import { Router } from "express";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  getCategoryBySlug,
  getCategoryProjects,
} from "./controller";
import { verifySuperAdmin } from "../../middleware/auth";

const router = Router();

// ── Public routes ──────────────────────────────────────────────────────────────
router.get("/", getCategories);
router.get("/by-slug/:slug", getCategoryBySlug);
router.get("/by-slug/:slug/projects", getCategoryProjects);

// ── Protected routes ───────────────────────────────────────────────────────────
router.post("/", verifySuperAdmin, createCategory);
router.patch("/reorder", verifySuperAdmin, reorderCategories);
router.put("/:id", verifySuperAdmin, updateCategory);
router.delete("/:id", verifySuperAdmin, deleteCategory);

export default router;
