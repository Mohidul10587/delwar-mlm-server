"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cart_controller_1 = require("./cart.controller");
const middlewares_1 = require("../user/middlewares");
const reusableControllers_1 = require("../shared/reusableControllers");
const cart_model_1 = __importDefault(require("./cart.model"));
const router = express_1.default.Router();
router.post("/create", cart_controller_1.createOrUpdate);
router.post("/add", middlewares_1.verifyUser, cart_controller_1.addToCart);
router.post("/addSingleItemToCart", cart_controller_1.addSingleItemToCart);
router.post(
  "/updateProductQntInDb",
  middlewares_1.verifyUser,
  cart_controller_1.updateProductQntInDb
);
router.get("/getUserCart/:userId", cart_controller_1.getUserCart);
router.get(
  "/getUserCartQuantity/:userId",
  cart_controller_1.getUserCartQuantity
);
router.delete(
  "/removeItemFromCart",
  middlewares_1.verifyUser,
  cart_controller_1.removeItemFromCart
);
router.patch("/update-isChecked", cart_controller_1.updateIsChecked);
router.delete(
  "/delete/:id",
  (0, reusableControllers_1.deleteById)(cart_model_1.default)
);
exports.default = router;
