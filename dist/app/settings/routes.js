"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = require("./controller");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
router.get("/public", controller_1.getPublicSettings); // H-02: public safe fields only
router.get("/", auth_1.verifyAdmin, controller_1.getSettings); // H-02: full settings requires admin
router.put("/", auth_1.verifySuperAdmin, controller_1.updateSettings);
// ── Company Payment Methods ───────────────────────────────────────────────────
router.get("/payment-methods", auth_1.verifyAdmin, controller_1.getCompanyPaymentMethods);
router.post("/payment-methods", auth_1.verifySuperAdmin, controller_1.addCompanyPaymentMethod);
router.put("/payment-methods/:id", auth_1.verifySuperAdmin, controller_1.updateCompanyPaymentMethod);
router.patch("/payment-methods/:id/toggle", auth_1.verifySuperAdmin, controller_1.toggleCompanyPaymentMethod);
router.delete("/payment-methods/:id", auth_1.verifySuperAdmin, controller_1.deleteCompanyPaymentMethod);
exports.default = router;
