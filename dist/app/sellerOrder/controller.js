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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSingleOrder = exports.getAllOrdersForAdmin = exports.getAllOrders = void 0;
const model_1 = require("./model"); // Adjust path if needed
const model_2 = __importDefault(require("../product/model"));
// Get all orders
const getAllOrders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const seller = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const orders = yield model_1.SellerOrder.find({ seller });
        console.log(orders);
        const totalProductsNumber = yield model_2.default.find({
            seller: seller,
        }).countDocuments();
        // Use aggregation to calculate counts in one query
        const results = yield model_1.SellerOrder.aggregate([
            { $match: { seller } }, // Match orders for the specific seller
            {
                $group: {
                    _id: "$status", // Group by status
                    count: { $sum: 1 }, // Count the documents in each group
                },
            },
        ]);
        // Parse results to dynamically extract counts for all statuses
        const counts = results.reduce((acc, item) => {
            acc[item._id] = item.count; // Use status as key and count as value
            return acc;
        }, {}); // Initialize an empty object for counts
        // Extract specific statuses or set defaults if they don't exist
        const totalPendingOrder = counts["Pending"] || 0;
        const totalApprovedOrder = counts["Approved"] || 0;
        const totalShippedOrder = counts["Shipped"] || 0;
        const totalCanceledOrder = counts["Cancelled"] || 0;
        const totalDeliveredOrder = counts["Delivered"] || 0;
        // Calculate the total orders
        const totalOrderNumber = totalPendingOrder +
            totalApprovedOrder +
            totalShippedOrder +
            totalCanceledOrder +
            totalDeliveredOrder;
        res.status(200).json({
            orders: orders.reverse(),
            totalPendingOrder,
            totalApprovedOrder,
            totalShippedOrder,
            totalCanceledOrder,
            totalDeliveredOrder,
            totalOrderNumber,
            totalProductsNumber,
        });
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching orders", error });
    }
});
exports.getAllOrders = getAllOrders;
// Get all orders
const getAllOrdersForAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const orders = yield model_1.SellerOrder.find().populate({
            path: "sellerId",
            select: "name image email",
            populate: {
                path: "sellerId",
                select: "sellerInfo.companyName photo email",
            },
        });
        const totalProductsNumber = yield model_2.default.find().countDocuments();
        // Use aggregation to calculate counts in one query
        const results = yield model_1.SellerOrder.aggregate([
            {
                $group: {
                    _id: "$status", // Group by status
                    count: { $sum: 1 }, // Count the documents in each group
                },
            },
        ]);
        // Parse results to dynamically extract counts for all statuses
        const counts = results.reduce((acc, item) => {
            acc[item._id] = item.count; // Use status as key and count as value
            return acc;
        }, {}); // Initialize an empty object for counts
        // Extract specific statuses or set defaults if they don't exist
        const totalPendingOrder = counts["Pending"] || 0;
        const totalApprovedOrder = counts["Approved"] || 0;
        const totalShippedOrder = counts["Shipped"] || 0;
        const totalCanceledOrder = counts["Cancelled"] || 0;
        const totalDeliveredOrder = counts["Delivered"] || 0;
        // Calculate the total orders
        const totalOrderNumber = totalPendingOrder +
            totalApprovedOrder +
            totalShippedOrder +
            totalCanceledOrder +
            totalDeliveredOrder;
        res.status(200).json({
            orders: orders.reverse(),
            totalPendingOrder,
            totalApprovedOrder,
            totalShippedOrder,
            totalCanceledOrder,
            totalDeliveredOrder,
            totalOrderNumber,
            totalProductsNumber,
        });
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching orders", error });
    }
});
exports.getAllOrdersForAdmin = getAllOrdersForAdmin;
// // Get a single order by ID
const getSingleOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const order = yield model_1.SellerOrder.findById({ _id: id }).populate({
            path: "seller",
            select: "name image email",
        });
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        res.status(200).json(order);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching order", error });
    }
});
exports.getSingleOrder = getSingleOrder;
