"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = require("./controller");
const middlewares_1 = require("../user/middlewares");
const reusableControllers_1 = require("../shared/reusableControllers");
const model_1 = __importDefault(require("./model"));
const router = (0, express_1.Router)();
//Admin routes
router.post("/create", middlewares_1.verifyStaffCategoryPermission, controller_1.create);
router.get("/singleForEditPage/:id", middlewares_1.verifyStaffCategoryPermission, controller_1.singleForEditPage);
router.get("/allCategoriesForSubCatAddPage", controller_1.allCategoriesForSubCatAddPage);
router.get("/getAllCatWithSubCat", controller_1.getAllCatWithSubCat);
router.get("/allCategoriesForAdminCatIndexPage", controller_1.allCategoriesForAdminCatIndexPage);
router.get("/productAddUtils", controller_1.productAddUtils);
router.get("/singleCategoryForCategoryEditPage/:id", controller_1.singleCategoryForCategoryEditPage);
router.get("/getNavbarUtils", controller_1.getNavbarUtils);
router.put("/update/:id", middlewares_1.verifyStaffCategoryPermission, controller_1.update);
// common routes
router.get("/allCategoryForFiltering", controller_1.allCategoryForFiltering);
router.get("/getAllCategoriesForCatMainPage", controller_1.getAllCategoriesForCatMainPage);
router.get("/filterUtils", controller_1.filterUtils);
router.get("/getAllForPageBuilder", controller_1.getAllForPageBuilder);
router.get("/page-data/:slug", controller_1.getCategoryPageData);
router.delete("/delete/:id", middlewares_1.verifyStaffCategoryPermission, (0, reusableControllers_1.deleteById)(model_1.default));
router.get("/slugsForSitemap", (0, reusableControllers_1.slugsForSitemap)(model_1.default));
exports.default = router;
