"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = require("./controller");
const middlewares_1 = require("../user/middlewares");
const router = (0, express_1.Router)();
//====================== For User ======================
router.get("/allForUserIndexPage", controller_1.allForUserIndexPage);
router.get("/allSlugsForUserIndexPage", controller_1.allSlugsForUserIndexPage);
router.get("/forUserDetailsPage/:slug", controller_1.forUserDetailsPage);
//====================== For Admin =====================
router.post("/", middlewares_1.verifyAdmin, controller_1.create);
router.get("/", middlewares_1.verifyAdmin, controller_1.allForAdminIndexPage);
router.get("/:id", middlewares_1.verifyAdmin, controller_1.singleForEditPage);
router.put("/:id", middlewares_1.verifyAdmin, controller_1.update);
router.delete("/:id", middlewares_1.verifyAdmin, controller_1.deleteById);
exports.default = router;
