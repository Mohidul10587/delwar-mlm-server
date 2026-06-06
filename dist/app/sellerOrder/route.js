"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const controller_1 = require("./controller");
const middlewares_1 = require("../user/middlewares");
const reusableControllers_1 = require("../shared/reusableControllers");
const model_1 = require("./model");
const router = express_1.default.Router();
router.get(
  "/getAllOrders",
  middlewares_1.verifySellerAndAdminToken,
  controller_1.getAllOrders
);
router.get(
  "/allOrdersForAdmin",
  middlewares_1.verifyAdmin,
  controller_1.getAllOrdersForAdmin
);
router.get("/getSingleOrder/:id", controller_1.getOrderById);
router.delete(
  "/delete/:id",
  middlewares_1.verifyAdmin,
  (0, reusableControllers_1.deleteById)(model_1.SellerOrder)
);
exports.default = router;
