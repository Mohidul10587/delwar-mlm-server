import { Router } from "express";
import { createPurchase, getPurchases, getPurchaseById, getBranchPurchaseById, getMyPurchases, getPurchaseReceipt, getInstallmentReceipt, downloadPurchaseReceipt, downloadInstallmentReceipt, getBranchPurchases } from "./controller";
import { updatePurchaseStatus, reclaimShares } from "./status.controller";
import { verifyUser, verifyAdmin, verifyStaff, verifyBranchManager, requirePermission } from "../../middleware/auth";
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
router.get("/branch",      verifyBranchManager, getBranchPurchases);
router.get("/branch/:id",  verifyBranchManager, getBranchPurchaseById);
router.get("/",            verifyStaff,       requirePermission("purchase.review"), getPurchases);
router.get("/installments/pending", verifyStaff, requirePermission("purchase.review"), getPendingInstallments);
// Both staff (super-admin) and branch managers can approve/reject
router.patch("/:id/status", verifyBranchManager, updatePurchaseStatus);
router.post("/:purchaseId/reclaim", verifyStaff, requirePermission("purchase.review"), reclaimShares);
router.get("/:id/receipt/download", verifyUser,  downloadPurchaseReceipt);
router.get("/:id/receipt",          verifyUser,  getPurchaseReceipt);
router.get("/:id",                  verifyStaff, requirePermission("purchase.review"), getPurchaseById);
router.post("/:purchaseId/installments", verifyUser, createInstallmentPayment);
router.get("/:purchaseId/installments/summary", verifyUser, getInstallmentSummary);
router.get("/:purchaseId/installments/:installmentId/receipt/download", verifyUser, downloadInstallmentReceipt);
router.get("/:purchaseId/installments/:installmentId/receipt", verifyUser, getInstallmentReceipt);
router.get("/:purchaseId/installments", verifyUser, getInstallmentsByPurchase);
router.patch(
  "/installments/:id/status",
  verifyStaff,
  requirePermission("purchase.review"),
  updateInstallmentStatus
);

export default router;
