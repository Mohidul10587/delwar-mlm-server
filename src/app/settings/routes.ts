import { Router } from "express";
import {
  getPublicSettings,
  getSettings,
  updateSettings,
  updateRewardConfig,
  getCompanyPaymentMethods,
  addCompanyPaymentMethod,
  updateCompanyPaymentMethod,
  toggleCompanyPaymentMethod,
  deleteCompanyPaymentMethod,
} from "./controller";
import { verifySuperAdmin, verifyAdmin } from "../../middleware/auth";

const router = Router();

router.get("/public", getPublicSettings);       // H-02: public safe fields only
router.get("/", verifyAdmin, getSettings);      // H-02: full settings requires admin
router.put("/", verifySuperAdmin, updateSettings);

// ── Reward Config ─────────────────────────────────────────────────────────────
router.patch("/reward-config", verifySuperAdmin, updateRewardConfig);

// ── Company Payment Methods ───────────────────────────────────────────────────
router.get("/payment-methods", verifyAdmin, getCompanyPaymentMethods);
router.post("/payment-methods", verifySuperAdmin, addCompanyPaymentMethod);
router.put("/payment-methods/:id", verifySuperAdmin, updateCompanyPaymentMethod);
router.patch("/payment-methods/:id/toggle", verifySuperAdmin, toggleCompanyPaymentMethod);
router.delete("/payment-methods/:id", verifySuperAdmin, deleteCompanyPaymentMethod);

export default router;
