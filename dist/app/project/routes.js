"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = require("./controller");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
// Static/named routes must come before /:id to avoid being swallowed by the param
router.get("/cover-slider", controller_1.getCoverSlider);
router.get("/stats", auth_1.verifyStaff, controller_1.getShareStats);
router.get("/with-stats", auth_1.verifyStaff, controller_1.getSharesWithStats);
router.get("/admin/all", auth_1.verifyStaff, controller_1.getSharesAdmin);
// Public routes (user-facing) — only active shares
router.get("/", controller_1.getShares);
router.get("/:id", controller_1.getShareById);
// Mutating routes
router.post("/", auth_1.verifySuperAdmin, controller_1.createShare);
router.put("/:id", auth_1.verifySuperAdmin, controller_1.updateShare);
router.delete("/:id", auth_1.verifySuperAdmin, controller_1.deleteShare);
// Cover slider management
router.patch("/:id/set-cover-slider", auth_1.verifyStaff, controller_1.setCoverSlider);
router.patch("/:id/unset-cover-slider", auth_1.verifyStaff, controller_1.unsetCoverSlider);
// Slot backfill — for shares that existed before slot system was introduced
router.post("/:id/backfill-slots", auth_1.verifySuperAdmin, controller_1.backfillSlots);
exports.default = router;
