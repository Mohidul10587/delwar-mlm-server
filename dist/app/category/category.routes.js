"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const category_controller_1 = require("./category.controller");
const middlewares_1 = require("../user/middlewares");
const reusableControllers_1 = require("../shared/reusableControllers");
const category_model_1 = __importDefault(require("./category.model"));
const router = (0, express_1.Router)();
//Admin routes
router.post(
  "/create",
  middlewares_1.verifyStaffCategoryPermission,
  category_controller_1.create
);
router.get(
  "/singleForEditPage/:id",
  middlewares_1.verifyStaffCategoryPermission,
  category_controller_1.singleForEditPage
);
router.get(
  "/allCategoriesForSubCatAddPage",
  category_controller_1.allCategoriesForSubCatAddPage
);
router.get("/getAllCatWithSubCat", category_controller_1.getAllCatWithSubCat);
router.get(
  "/allCategoriesForAdminCatIndexPage",
  category_controller_1.allCategoriesForAdminCatIndexPage
);
router.get("/productAddUtils", category_controller_1.productAddUtils);
router.get(
  "/singleCategoryForCategoryEditPage/:id",
  category_controller_1.singleCategoryForCategoryEditPage
);
router.get("/getNavbarUtils", category_controller_1.getNavbarUtils);
router.put(
  "/update/:id",
  middlewares_1.verifyStaffCategoryPermission,
  category_controller_1.update
);
// common routes
router.get(
  "/allCategoryForFiltering",
  category_controller_1.allCategoryForFiltering
);
router.get(
  "/getAllCategoriesForCatMainPage",
  category_controller_1.getAllCategoriesForCatMainPage
);
router.get("/filterUtils", category_controller_1.filterUtils);
router.get("/getAllForPageBuilder", category_controller_1.getAllForPageBuilder);
router.delete(
  "/delete/:id",
  middlewares_1.verifyStaffCategoryPermission,
  (0, reusableControllers_1.deleteById)(category_model_1.default)
);
exports.default = router;
