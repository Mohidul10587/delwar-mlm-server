"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = require("./controller");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
router.get("/fee", auth_1.verifyUser, controller_1.getTransferFee);
router.post("/", auth_1.verifyUser, controller_1.sendTransfer);
exports.default = router;
