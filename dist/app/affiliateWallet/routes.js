"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = require("./controller");
const middlewares_1 = require("../user/middlewares");
const router = (0, express_1.Router)();
//====================== For Affiliate User ======================
router.get("/my-wallet", middlewares_1.verifyUser, controller_1.getMyWallet);
exports.default = router;
