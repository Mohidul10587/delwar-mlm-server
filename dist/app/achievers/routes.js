"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = require("./controller");
const router = (0, express_1.Router)();
// Public endpoint — no auth required (shown on the public home page)
router.get("/", controller_1.getAchievers);
exports.default = router;
