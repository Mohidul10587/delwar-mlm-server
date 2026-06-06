"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = require("./controller");
const middlewares_1 = require("../user/middlewares");
const router = (0, express_1.Router)();
router.post("/apply", middlewares_1.verifyUser, controller_1.applyAffiliate);
router.get(
  "/dashboard",
  middlewares_1.verifyUser,
  controller_1.getAffiliateDashboard
);
router.get(
  "/link/:productId",
  middlewares_1.verifyUser,
  controller_1.generateAffiliateLink
);
exports.default = router;
