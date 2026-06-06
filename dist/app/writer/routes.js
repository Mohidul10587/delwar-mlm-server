"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = require("./controller");
const middlewares_1 = require("../user/middlewares");
const reusableControllers_1 = require("../shared/reusableControllers");
const model_1 = __importDefault(require("./model"));
const router = (0, express_1.Router)();
router.post(
  "/create",
  middlewares_1.verifyStaffWriterPermission,
  controller_1.create
);
router.post("/createBySeller", middlewares_1.verSellerTkn, controller_1.create);
// Route to get all writer IDs
router.get("/singleForEditPage/:id", controller_1.singleForEditPage);
router.put(
  "/update/:id",
  middlewares_1.verifyStaffWriterPermission,
  controller_1.update
);
router.get("/allForAdmin", middlewares_1.verifyAdmin, controller_1.allForAdmin);
router.get("/allForUser", controller_1.allForUser);
router.get("/singleWriterBySlug/:slug", controller_1.getWriterBySlug);
router.get("/singleWriter/:id", controller_1.getWriteById);
router.get("/getAllForPageBuilder", controller_1.getAllForPageBuilder);
router.get("/page-data/:slug", controller_1.getWriterPageData);
router.delete(
  "/delete/:id",
  middlewares_1.verifyStaffWriterPermission,
  (0, reusableControllers_1.deleteById)(model_1.default)
);
router.get(
  "/slugsForSitemap",
  (0, reusableControllers_1.slugsForSitemap)(model_1.default)
);
exports.default = router;
