"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrderById =
  exports.getAllOrdersForAdmin =
  exports.getAllOrders =
    void 0;
const sellerOrder_model_1 = require("./sellerOrder.model"); // Adjust path if needed
const model_1 = __importDefault(require("../product/model"));
// Get all orders
const getAllOrders = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
      const sellerId =
        (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
      const orders = yield sellerOrder_model_1.SellerOrder.find({ sellerId });
      const totalProductsNumber = yield model_1.default
        .find({
          seller: sellerId,
        })
        .countDocuments();
      // Use aggregation to calculate counts in one query
      const results = yield sellerOrder_model_1.SellerOrder.aggregate([
        { $match: { sellerId } }, // Match orders for the specific seller
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
      const totalOrderNumber =
        totalPendingOrder +
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
    } catch (error) {
      res.status(500).json({ message: "Error fetching orders", error });
    }
  });
exports.getAllOrders = getAllOrders;
// Get all orders
const getAllOrdersForAdmin = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const orders = yield sellerOrder_model_1.SellerOrder.find().populate({
        path: "sellerId",
        select: "name image email",
        populate: {
          path: "sellerId",
          select: "companyName photo email",
        },
      });
      const totalProductsNumber = yield model_1.default.find().countDocuments();
      // Use aggregation to calculate counts in one query
      const results = yield sellerOrder_model_1.SellerOrder.aggregate([
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
      const totalOrderNumber =
        totalPendingOrder +
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
    } catch (error) {
      res.status(500).json({ message: "Error fetching orders", error });
    }
  });
exports.getAllOrdersForAdmin = getAllOrdersForAdmin;
// // Get a single order by ID
const getOrderById = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const { id } = req.params;
      const order = yield sellerOrder_model_1.SellerOrder.findById({
        _id: id,
      }).populate({
        path: "sellerId",
        select: "name image email",
      });
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.status(200).json(order);
    } catch (error) {
      res.status(500).json({ message: "Error fetching order", error });
    }
  });
exports.getOrderById = getOrderById;
//   const session = await mongoose.startSession();
//   session.startTransaction();
//   try {
//     const sellerOrderId = req.params.id;
//     const { status } = req.body;
//     if (!status) {
//       throw new Error("Status is required");
//     }
//     // 1️⃣ Find previous order
//     const previousOrder = await SellerOrder.findOne({
//       _id: sellerOrderId,
//     }).session(session);
//     if (!previousOrder) {
//       throw new Error("Order not found");
//     }
//     const previousStatus = previousOrder.status;
//     // 2️⃣ Update product quantities conditionally
//     if (status === "Delivered" && previousStatus !== "Delivered") {
//       // Delivered হলে stock কমাও
//       for (const product of previousOrder.products) {
//         const existingProduct = await Product.findById(product._id).session(
//           session
//         );
//         if (existingProduct) {
//           const newQuantity = Math.max(
//             0,
//             existingProduct.existingQnt - product.quantity
//           );
//           await Product.findOneAndUpdate(
//             { _id: product._id },
//             { $set: { existingQnt: newQuantity } },
//             { session }
//           );
//         }
//       }
//     }
//     if (previousStatus === "Delivered" && status === "Cancelled") {
//       // Cancelled হলে stock ফেরত দাও
//       for (const product of previousOrder.products) {
//         const existingProduct = await Product.findById(product._id).session(
//           session
//         );
//         if (existingProduct) {
//           const newQuantity = existingProduct.existingQnt + product.quantity;
//           await Product.findOneAndUpdate(
//             { _id: product._id },
//             { $set: { existingQnt: newQuantity } },
//             { session }
//           );
//         }
//       }
//     }
//     // 3️⃣ Update order status
//     const updatedOrder = await SellerOrder.findOneAndUpdate(
//       { _id: sellerOrderId },
//       { status },
//       { new: true, session }
//     );
//     if (!updatedOrder) {
//       throw new Error("Order not found after update");
//     }
//     const seller = await User.findById(updatedOrder.sellerId).session(session);
//     if (!seller) {
//       throw new Error("Seller not found");
//     }
//     // 4️⃣ Calculate commissions
//     const totalCommission = updatedOrder.products.reduce(
//       (total, product) =>
//         total +
//         (product.sellingPrice *
//           seller.sellerInfo?.commissionForAdmin *
//           product.quantity) /
//           100,
//       0
//     );
//     const remainedCommission = updatedOrder.products.reduce(
//       (total, product) =>
//         total +
//         ((100 - seller.sellerInfo?.commissionForAdmin || 10) / 100) *
//           product.sellingPrice *
//           product.quantity,
//       0
//     );
//     const lastTnxOfAdmin = await AdminTnx.findOne()
//       .sort({ _id: -1 })
//       .session(session);
//     const lastTnxOfSeller = await Transaction.findOne({
//       sellerId: updatedOrder.sellerId,
//     })
//       .sort({ _id: -1 })
//       .session(session);
//     // 5️⃣ Handle status transitions
//     // Delivered ➡ Cancelled (Refund commissions)
//     if (previousStatus === "Delivered" && status === "Cancelled") {
//       await Transaction.create(
//         [
//           {
//             sellerId: updatedOrder.sellerId,
//             userId: updatedOrder.userId,
//             orderId: updatedOrder._id,
//             recentAmount: totalCommission,
//             previousAmount: lastTnxOfSeller?.currentTotal ?? 0,
//             currentTotal:
//               (lastTnxOfSeller?.currentTotal ?? 0) - totalCommission,
//             description: "Cancel after delivered",
//           },
//         ],
//         { session }
//       );
//       await AdminTnx.create(
//         [
//           {
//             sellerId: updatedOrder.sellerId,
//             userId: updatedOrder.userId,
//             orderId: updatedOrder._id,
//             recentAmount: remainedCommission,
//             previousAmount: lastTnxOfAdmin?.currentTotal ?? 0,
//             currentTotal:
//               (lastTnxOfAdmin?.currentTotal ?? 0) - remainedCommission,
//             description: "Cancel after delivered",
//           },
//         ],
//         { session }
//       );
//     }
//     // Any status ➡ Delivered (Give commissions)
//     if (status === "Delivered" && previousStatus !== "Delivered") {
//       await Transaction.create(
//         [
//           {
//             sellerId: updatedOrder.sellerId,
//             userId: updatedOrder.userId,
//             orderId: updatedOrder._id,
//             recentAmount: totalCommission,
//             previousAmount: lastTnxOfSeller?.currentTotal ?? 0,
//             currentTotal:
//               (lastTnxOfSeller?.currentTotal ?? 0) + totalCommission,
//             description: "Order delivered",
//           },
//         ],
//         { session }
//       );
//       await AdminTnx.create(
//         [
//           {
//             sellerId: updatedOrder.sellerId,
//             userId: updatedOrder.userId,
//             orderId: updatedOrder._id,
//             recentAmount: remainedCommission,
//             previousAmount: lastTnxOfAdmin?.currentTotal ?? 0,
//             currentTotal:
//               (lastTnxOfAdmin?.currentTotal ?? 0) + remainedCommission,
//             description: "Order delivered",
//           },
//         ],
//         { session }
//       );
//     }
//     // 6️⃣ Commit transaction
//     await session.commitTransaction();
//     res.status(200).json(updatedOrder);
//   } catch (error: any) {
//     await session.abortTransaction();
//     console.error("Error updating order status:", error);
//     res
//       .status(500)
//       .json({ message: error.message || "Error updating order status" });
//   } finally {
//     session.endSession();
//   }
// };
// // 'Update status by admin'
// // Delete an order
// export const deleteOrder = async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//     const deletedOrder = await SellerOrder.findByIdAndDelete(id);
//     if (!deletedOrder) {
//       return res.status(404).json({ message: "Order not found" });
//     }
//     res.status(200).json({ message: "Order deleted successfully" });
//   } catch (error) {
//     res.status(500).json({ message: "Error deleting order", error });
//   }
// };
