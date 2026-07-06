"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = require("./controller");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
// Admin submits expenses (requires "expense.submit" permission — superadmin bypasses this check)
router.post("/admin/submit", auth_1.verifyAdmin, (0, auth_1.requirePermission)("expense.submit"), controller_1.submitAdminExpense);
router.get("/admin/my", auth_1.verifyAdmin, (0, auth_1.requirePermission)("expense.submit"), controller_1.getMyAdminExpenses);
// Super admin reviews all submitted expenses
router.get("/admin/all", auth_1.verifySuperAdmin, controller_1.getAllAdminExpenses);
router.patch("/admin/:id/review", auth_1.verifySuperAdmin, controller_1.reviewAdminExpense);
router.delete("/admin/:id", auth_1.verifySuperAdmin, controller_1.deleteAdminExpense);
exports.default = router;
