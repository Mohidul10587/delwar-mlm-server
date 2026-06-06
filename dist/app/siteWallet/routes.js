"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = require("./controller");
const middlewares_1 = require("../user/middlewares");
const router = (0, express_1.Router)();
//====================== For User ======================
// router.get("/allForUserIndexPage", allForUserIndexPage);
// router.get("/allSlugsForUserIndexPage", allSlugsForUserIndexPage);
// router.get("/forUserDetailsPage/:slug", forUserDetailsPage);
//====================== For Admin =====================
router.post("/create", middlewares_1.verifyAdmin, controller_1.create);
// router.get("/allForAdminIndexPage", verifyAdmin, allForAdminIndexPage);
// router.get("/singleForEditPage/:id", verifyAdmin, singleForEditPage);
// router.put("/update/:id", verifyAdmin, update);
// router.delete("/delete/:id", verifyAdmin, deleteById(SiteWallet));
exports.default = router;
