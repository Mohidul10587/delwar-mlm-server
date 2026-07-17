"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = require("./controller");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
// Public (logged-in user): get active branches list for withdrawal form
router.get("/", auth_1.verifyUser, controller_1.getBranches);
// Superadmin only
router.get("/all", auth_1.verifySuperAdmin, controller_1.getAllBranches);
router.post("/", auth_1.verifySuperAdmin, controller_1.createBranch);
router.put("/:id", auth_1.verifySuperAdmin, controller_1.updateBranch);
router.delete("/:id", auth_1.verifySuperAdmin, controller_1.deleteBranch);
exports.default = router;
