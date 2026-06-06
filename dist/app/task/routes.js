"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = require("./controller");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
//====================== For User ======================
router.get(
  "/package-tasks",
  auth_1.verifyUser,
  controller_1.getTodayShareTasks
);
router.post(
  "/package-tasks/complete/:id",
  auth_1.verifyUser,
  controller_1.completeShareTask
);
exports.default = router;
