"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = require("./controller");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
router.get("/public", controller_1.getPublicSettings); // H-02: public safe fields only
router.get("/", auth_1.verifyAdmin, controller_1.getSettings); // H-02: full settings requires admin
router.put("/", auth_1.verifySuperAdmin, controller_1.updateSettings);
exports.default = router;
