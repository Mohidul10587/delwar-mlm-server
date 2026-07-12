"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = require("./controller");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
// Public — active rules for frontend display (no auth required)
router.get("/public", controller_1.getPublicRewardRules);
// Admin — view all rules (active + inactive)
router.get("/", auth_1.verifyAdmin, controller_1.getRewardRules);
// SuperAdmin — create, update, delete rules
router.post("/", auth_1.verifySuperAdmin, controller_1.addRewardRule);
router.put("/:targetAmount", auth_1.verifySuperAdmin, controller_1.updateRewardRule);
router.delete("/:targetAmount", auth_1.verifySuperAdmin, controller_1.deleteRewardRule);
exports.default = router;
