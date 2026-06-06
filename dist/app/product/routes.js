"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = require("./controller");
const auth_1 = require("../../middleware/auth");
const filter_1 = require("./filter");
const router = (0, express_1.Router)();
//====================== For User ======================
router.get("/product-types", filter_1.getProductTypes);
router.get("/shop", filter_1.allForUserIndex);
router.get("/shop/slugs", controller_1.getAllSlugs);
router.get("/affiliate", auth_1.verifyUser, controller_1.getAffiliateProducts);
router.get("/shop/:slug", controller_1.forUserDetails);
//====================== For Admin =====================
router.post("/create", auth_1.verifyAdmin, controller_1.create);
router.get("/allForAdminIndex", auth_1.verifyAdmin, controller_1.allForAdminIndex);
router.get("/singleForEdit/:id", auth_1.verifyAdmin, controller_1.singleForEdit);
router.put("/update/:id", auth_1.verifyAdmin, controller_1.update);
router.delete("/delete/:id", auth_1.verifyAdmin, controller_1.deleteById);
exports.default = router;
