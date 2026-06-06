"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const controller_1 = require("./controller");
const router = (0, express_1.Router)();
// Admin routes
router.get("/all", auth_1.verifyAdmin, controller_1.getAllPurchases);
// User routes
router.post("/purchase", auth_1.verifyUser, controller_1.purchaseShare);
router.get("/my-shares", auth_1.verifyUser, controller_1.getMyShares);
router.post(
  "/claim/:purchaseId",
  auth_1.verifyUser,
  controller_1.claimDailyIncome
);
exports.default = router;
