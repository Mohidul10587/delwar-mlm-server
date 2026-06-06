"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const controller_1 = require("./controller");
const middlewares_1 = require("../user/middlewares");
const router = express_1.default.Router();
// Public routes
router.post("/validate", controller_1.validateCoupon);
router.post("/apply", controller_1.validateCoupon); // Add apply endpoint
router.get("/checkSellerHasCoupon/:sellerId", controller_1.checkSellerHasCoupon);
router.get("/singleForEdit/:id", controller_1.singleForEdit);
// Seller routes (protected)
router.post("/create", middlewares_1.verSellerTkn, controller_1.createCoupon);
router.put("/update/:id", middlewares_1.verSellerTkn, controller_1.updateCoupon);
router.delete("/:id", middlewares_1.verSellerTkn, controller_1.deleteCoupon);
router.get("/seller/list", middlewares_1.verSellerTkn, controller_1.getSellerCoupons);
router.get("/seller/products", middlewares_1.verSellerTkn, controller_1.getSellerProducts);
exports.default = router;
