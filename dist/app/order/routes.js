"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const controller_1 = require("./controller");
const createOrder_1 = require("./createOrder");
const router = (0, express_1.Router)();
router.post("/create", createOrder_1.createOrder);
router.post("/create-direct", createOrder_1.createDirectOrder);
router.get("/my-orders", auth_1.verifyUser, controller_1.getMyOrders);
router.get("/all", auth_1.verifyAdmin, controller_1.getAllOrders);
router.patch("/:orderId/status", auth_1.verifyAdmin, controller_1.updateOrderStatus);
// SSLCommerz callbacks (POST from gateway)
router.post("/ssl/success/:orderId", createOrder_1.sslSuccess);
router.post("/ssl/fail/:orderId", createOrder_1.sslFail);
router.post("/ssl/cancel/:orderId", createOrder_1.sslCancel);
exports.default = router;
