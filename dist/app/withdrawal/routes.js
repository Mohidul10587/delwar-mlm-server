"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = require("./controller");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
router.post("/", auth_1.verifyUser, controller_1.createWithdrawal);
router.get("/my", auth_1.verifyUser, controller_1.getMyWithdrawals);
// Both superadmin/admin AND branch_manager can list withdrawals (controller filters by branch for manager)
router.get("/", auth_1.verifyBranchManager, controller_1.getWithdrawals);
router.patch("/:id/status", auth_1.verifyBranchManager, controller_1.updateWithdrawalStatus);
exports.default = router;
