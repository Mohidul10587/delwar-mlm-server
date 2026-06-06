"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = require("./controller");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
router.get("/", controller_1.getSettings);
router.put("/", auth_1.verifySuperAdmin, controller_1.updateSettings);
exports.default = router;
