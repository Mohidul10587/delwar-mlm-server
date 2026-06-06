import { Router } from "express";
import { createPurchase, getPurchases, getMyPurchases } from "./controller";
import { updatePurchaseStatus } from "./status.controller";
import { verifyUser, verifyAdmin, verifyStaff, requirePermission } from "../../middleware/auth";
import {
  createInstallmentPayment,
  getInstallmentsByPurchase,
  getInstallmentSummary,
  updateInstallmentStatus,
} from "./installment.controller";

const router = Router();

router.post("/",           verifyUser,        createPurchase);
router.get("/my",          verifyUser,        getMyPurchases);
router.get("/",            verifyStaff,       requirePermission("purchase.review"), getPurchases);
router.patch("/:id/status", verifyStaff,      requirePermission("purchase.review"), updatePurchaseStatus);
router.post("/:purchaseId/installments", verifyUser, createInstallmentPayment);
router.get("/:purchaseId/installments/summary", verifyUser, getInstallmentSummary);
router.get("/:purchaseId/installments", verifyUser, getInstallmentsByPurchase);
router.patch(
  "/installments/:id/status",
  verifyStaff,
  requirePermission("purchase.review"),
  updateInstallmentStatus
);

export default router;
