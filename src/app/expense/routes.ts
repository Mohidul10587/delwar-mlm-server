import { Router } from "express";
import {
  submitAdminExpense,
  getMyAdminExpenses,
  getAllAdminExpenses,
  reviewAdminExpense,
  updateAdminExpense,
  deleteAdminExpense,
} from "./controller";
import { verifySuperAdmin, verifyAdmin, requirePermission } from "../../middleware/auth";

const router = Router();

// Admin submits expenses (requires "expense.submit" permission — superadmin bypasses this check)
router.post("/admin/submit", verifyAdmin, requirePermission("expense.submit"), submitAdminExpense);
router.get("/admin/my", verifyAdmin, requirePermission("expense.submit"), getMyAdminExpenses);

// Admin edits / deletes their own pending expense
router.patch("/admin/:id", verifyAdmin, requirePermission("expense.submit"), updateAdminExpense);
router.delete("/admin/:id", verifyAdmin, requirePermission("expense.submit"), deleteAdminExpense);

// Super admin reviews all submitted expenses
router.get("/admin/all", verifySuperAdmin, getAllAdminExpenses);
router.patch("/admin/:id/review", verifySuperAdmin, reviewAdminExpense);

export default router;
