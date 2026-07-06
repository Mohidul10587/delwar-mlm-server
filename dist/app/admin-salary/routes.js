"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = require("./controller");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
// Super admin routes
router.get("/configs", auth_1.verifySuperAdmin, controller_1.getSalaryConfigs);
router.post("/set", auth_1.verifySuperAdmin, controller_1.setSalary);
router.post("/release", auth_1.verifySuperAdmin, controller_1.releaseSalary);
router.get("/history", auth_1.verifySuperAdmin, controller_1.getSalaryHistory);
// Admin self-service routes
router.get("/my-history", auth_1.verifyAdmin, controller_1.getMyHistory);
exports.default = router;
