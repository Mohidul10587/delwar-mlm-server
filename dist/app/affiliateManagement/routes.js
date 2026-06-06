"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = require("./controller");
const controller_2 = require("./controller");
const controller_3 = require("./controller");
const adminController_1 = require("./adminController");
const middlewares_1 = require("../user/middlewares");
const router = (0, express_1.Router)();
// Affiliate application management routes
router.get(
  "/applications",
  middlewares_1.verifyAdmin,
  adminController_1.getAffiliateApplications
);
router.get(
  "/applications/:userId",
  middlewares_1.verifyAdmin,
  adminController_1.getAffiliateApplicationDetails
);
router.patch(
  "/applications/:userId/approve",
  middlewares_1.verifyAdmin,
  adminController_1.approveAffiliateApplication
);
router.patch(
  "/applications/:userId/reject",
  middlewares_1.verifyAdmin,
  adminController_1.rejectAffiliateApplication
);
// Affiliate management routes
router.get(
  "/affiliates",
  middlewares_1.verifyAdmin,
  controller_1.getAffiliates
);
router.get(
  "/affiliates/:id",
  middlewares_1.verifyAdmin,
  controller_1.getAffiliateDetails
);
router.patch(
  "/affiliates/:id/approve",
  middlewares_1.verifyAdmin,
  controller_1.approveAffiliate
);
router.patch(
  "/affiliates/:id/reject",
  middlewares_1.verifyAdmin,
  controller_1.rejectAffiliate
);
router.patch(
  "/affiliates/:id/toggle-status",
  middlewares_1.verifyAdmin,
  controller_1.toggleAffiliateStatus
);
// Commission management routes
router.get(
  "/commissions",
  middlewares_1.verifyAdmin,
  controller_2.getCommissions
);
router.patch(
  "/commissions/:id/approve",
  middlewares_1.verifyAdmin,
  controller_2.approveCommission
);
router.patch(
  "/commissions/:id/reject",
  middlewares_1.verifyAdmin,
  controller_2.rejectCommission
);
router.patch(
  "/commissions/:id/mark-paid",
  middlewares_1.verifyAdmin,
  controller_2.markCommissionPaid
);
router.patch(
  "/commissions/bulk-approve",
  middlewares_1.verifyAdmin,
  controller_2.bulkApproveCommissions
);
// Withdrawal management routes
router.get(
  "/withdrawals",
  middlewares_1.verifyAdmin,
  controller_3.getWithdrawals
);
router.patch(
  "/withdrawals/:id/approve",
  middlewares_1.verifyAdmin,
  controller_3.approveWithdrawal
);
router.patch(
  "/withdrawals/:id/reject",
  middlewares_1.verifyAdmin,
  controller_3.rejectWithdrawal
);
exports.default = router;
