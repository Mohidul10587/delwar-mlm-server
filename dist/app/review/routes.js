"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = require("./controller");
const middlewares_1 = require("../user/middlewares");
const reusableControllers_1 = require("../shared/reusableControllers");
const model_1 = require("./model");
const router = (0, express_1.Router)();
//====================== For User ======================
router.post("/create", middlewares_1.verifyUser, controller_1.createReview);
router.put("/update/:id", middlewares_1.verifyUser, controller_1.updateReview);
router.get("/product/:productId", controller_1.getProductReviews);
router.get(
  "/my-reviews",
  middlewares_1.verifyUser,
  controller_1.getUserReviews
);
//====================== For Admin =====================
router.get("/all", middlewares_1.verifyAdmin, controller_1.getAllReviews);
router.put(
  "/approve/:id",
  middlewares_1.verifyAdmin,
  controller_1.approveReview
);
router.put("/reject/:id", middlewares_1.verifyAdmin, controller_1.rejectReview);
router.delete(
  "/delete/:id",
  middlewares_1.verifyAdmin,
  (0, reusableControllers_1.deleteById)(model_1.Review)
);
exports.default = router;
