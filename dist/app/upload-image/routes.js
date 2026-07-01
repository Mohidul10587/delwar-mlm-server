"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = require("./controller");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
// Fix S-04: upload route is now protected — must be logged in
router.post("/upload", auth_1.verifyUser, controller_1.uploadImage);
exports.default = router;
