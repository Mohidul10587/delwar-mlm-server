"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const settings_controller_1 = require("./settings.controller");
const middlewares_1 = require("../user/middlewares");
const router = (0, express_1.Router)();
router.get("/", settings_controller_1.getSettings);
router.get(
  "/getPrivacyPoliciesOfSettings",
  settings_controller_1.getPrivacyPoliciesOfSettings
);
router.put(
  "/updateSellerDefaultStatus/:id",
  settings_controller_1.updateDefaultSellerStatus
);
router.put(
  "/update/:id",
  middlewares_1.verifyAdmin,
  settings_controller_1.update
);
exports.default = router;
