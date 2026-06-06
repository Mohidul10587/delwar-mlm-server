"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const wishlist_controller_1 = require("./wishlist.controller");
const middlewares_1 = require("../user/middlewares");
const router = express_1.default.Router();
// Route to add a product to the wishlist
router.post(
  "/addToWishlist",
  middlewares_1.verifyUser,
  wishlist_controller_1.addToWishlist
);
// Route to remove a product from the wishlist
router.delete(
  "/deleteSingle/:productId",
  middlewares_1.verifyUser,
  wishlist_controller_1.deleteSingleFromWishlist
);
router.delete(
  "/deleteAll",
  middlewares_1.verifyUser,
  wishlist_controller_1.clearWishlist
);
// Route to get the user's wishlist
router.get(
  "/getWishlist",
  middlewares_1.verifyUser,
  wishlist_controller_1.getWishlist
);
exports.default = router;
