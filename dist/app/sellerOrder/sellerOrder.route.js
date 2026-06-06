"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const sellerOrder_controller_1 = require("./sellerOrder.controller");
const middlewares_1 = require("../user/middlewares");
const reusableControllers_1 = require("../shared/reusableControllers");
const sellerOrder_model_1 = require("./sellerOrder.model");
const router = express_1.default.Router();
router.get(
  "/getAllOrders",
  middlewares_1.verifySellerAndAdminToken,
  sellerOrder_controller_1.getAllOrders
);
router.get(
  "/allOrdersForAdmin",
  middlewares_1.verifyAdmin,
  sellerOrder_controller_1.getAllOrdersForAdmin
);
router.get("/getSingleOrder/:id", sellerOrder_controller_1.getOrderById);
router.delete(
  "/delete/:id",
  middlewares_1.verifyAdmin,
  (0, reusableControllers_1.deleteById)(sellerOrder_model_1.SellerOrder)
);
exports.default = router;
