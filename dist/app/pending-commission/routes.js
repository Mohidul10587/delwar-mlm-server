"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = require("./controller");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
// Super Admin only routes
router.get("/batches", auth_1.verifySuperAdmin, controller_1.getPendingBatches);
router.get("/batches/:batchId", auth_1.verifySuperAdmin, controller_1.getBatchDetails);
router.post("/batches/:batchId/release", auth_1.verifySuperAdmin, controller_1.releaseBatch);
// User route — নিজের pending commission দেখার জন্য
router.get("/my", auth_1.verifyUser, controller_1.getMyPendingCommissions);
exports.default = router;
