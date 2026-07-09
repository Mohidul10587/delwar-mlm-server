"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = require("./controller");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
router.get("/my", auth_1.verifyUser, controller_1.getMyRank);
router.get("/salary-eligible", auth_1.verifySuperAdmin, controller_1.getSalaryEligibleUsers);
router.post("/release-salary/:userId", auth_1.verifySuperAdmin, controller_1.releaseRankSalaryForUser);
router.get("/", auth_1.verifyUser, controller_1.getRanks); // H-01 fix: require login to see rank list
router.post("/", auth_1.verifySuperAdmin, controller_1.createRank);
router.post("/release-salaries", auth_1.verifySuperAdmin, controller_1.releaseMonthlySalaries);
router.put("/replace-all", auth_1.verifySuperAdmin, controller_1.replaceAllRanks);
router.put("/:id", auth_1.verifySuperAdmin, controller_1.updateRank);
router.delete("/:id", auth_1.verifySuperAdmin, controller_1.deleteRank);
exports.default = router;
