import { Router } from "express";
import {
  createExpense,
  getExpenses,
  deleteExpense,
  submitAdminExpense,
  getMyAdminExpenses,
  getAllAdminExpenses,
  reviewAdminExpense,
  deleteAdminExpense,
} from "./controller";
import { verifySuperAdmin, verifyAdmin, verifyStaff } from "../../middleware/auth";

const router = Router();

// ─── Legacy company expense (super-admin managed) ─────────────────────────────
router.get("/", verifySuperAdmin, getExpenses);
router.post("/", verifySuperAdmin, createExpense);
router.delete("/:id", verifySuperAdmin, deleteExpense);

// ─── Admin expense approval system ───────────────────────────────────────────
// Admin submits expenses
router.post("/admin/submit", verifyAdmin, submitAdminExpense);
router.get("/admin/my", verifyAdmin, getMyAdminExpenses);

// Super admin reviews
router.get("/admin/all", verifySuperAdmin, getAllAdminExpenses);
router.patch("/admin/:id/review", verifySuperAdmin, reviewAdminExpense);
router.delete("/admin/:id", verifySuperAdmin, deleteAdminExpense);

export default router;
