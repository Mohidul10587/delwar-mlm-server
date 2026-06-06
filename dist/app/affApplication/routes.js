"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = require("./controller");
const middlewares_1 = require("../user/middlewares");
const router = (0, express_1.Router)();
router.post("/apply", middlewares_1.verifyUser, controller_1.apply);
router.get("/status", middlewares_1.verifyUser, controller_1.getStatus);
router.get("/dashboard", middlewares_1.verifyUser, controller_1.dashboard);
router.get("/affiliate-products", controller_1.getAffiliateProducts);
router.get(
  "/applications",
  middlewares_1.verifyAdmin,
  controller_1.getApplications
);
router.patch(
  "/applications/:id/approve",
  middlewares_1.verifyAdmin,
  controller_1.approve
);
router.patch(
  "/applications/:id/reject",
  middlewares_1.verifyAdmin,
  controller_1.reject
);
router.delete(
  "/applications/:id",
  middlewares_1.verifyAdmin,
  controller_1.deleteApplication
);
router.get(
  "/link/:productId",
  middlewares_1.verifyUser,
  controller_1.generateAffiliateLink
);
exports.default = router;
