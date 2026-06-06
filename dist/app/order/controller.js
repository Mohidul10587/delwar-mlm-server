"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOrderStatus = exports.getAllOrders = exports.getMyOrders = void 0;
const model_1 = require("./model");
const getMyOrders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const orders = yield model_1.Order.find({ userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id }).sort({
            createdAt: -1,
        });
        res.json(orders);
    }
    catch (_b) {
        res.status(500).json({ message: "Error fetching orders" });
    }
});
exports.getMyOrders = getMyOrders;
const getAllOrders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const orders = yield model_1.Order.find()
            .populate("userId", "name userId phone")
            .sort({ createdAt: -1 });
        res.json(orders);
    }
    catch (_a) {
        res.status(500).json({ message: "Error fetching orders" });
    }
});
exports.getAllOrders = getAllOrders;
const updateOrderStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { orderId } = req.params;
        const { status, cancelReason } = req.body;
        const update = { status };
        if (status === "cancelled" && cancelReason)
            update.cancelReason = cancelReason;
        const order = yield model_1.Order.findByIdAndUpdate(orderId, update, { new: true });
        if (!order)
            return res.status(404).json({ message: "Order not found" });
        res.json({ message: "Order status updated", order });
    }
    catch (_a) {
        res.status(500).json({ message: "Error updating order status" });
    }
});
exports.updateOrderStatus = updateOrderStatus;
