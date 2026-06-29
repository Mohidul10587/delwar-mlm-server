import { Router } from "express";
import { createPurchase, getPurchases, getPurchaseById, getMyPurchases } from "./controller";
import { updatePurchaseStatus, reclaimShares } from "./status.controller";
import { verifyUser, verifyAdmin, verifyStaff, requirePermission } from "../../middleware/auth";
import {
  createInstallmentPayment,
  getInstallmentsByPurchase,
  getInstallmentSummary,
  updateInstallmentStatus,
  getPendingInstallments,
} from "./installment.controller";

const router = Router();

router.post("/",           verifyUser,        createPurchase);
router.get("/my",          verifyUser,        getMyPurchases);
router.get("/",            verifyStaff,       requirePermission("purchase.review"), getPurchases);
router.get("/installments/pending", verifyStaff, requirePermission("purchase.review"), getPendingInstallments);
router.patch("/:id/status",         verifyStaff, requirePermission("purchase.review"), updatePurchaseStatus);
router.post("/:purchaseId/reclaim", verifyStaff, requirePermission("purchase.review"), reclaimShares);
router.get("/:id",                  verifyStaff, requirePermission("purchase.review"), getPurchaseById);
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
