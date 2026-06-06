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
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const model_1 = __importDefault(require("../order/model"));
const cart_model_1 = __importDefault(require("../cart/cart.model"));
const middlewares_1 = require("../user/middlewares");
const mongoose_1 = __importDefault(require("mongoose"));
const model_2 = require("../coupon/model");
const model_3 = __importDefault(require("../product/model"));
const settings_model_1 = __importDefault(require("../settings/settings.model"));
const router = express_1.default.Router();
// Environment variables
const MERCHANT_ID = process.env.AMARPAY_MERCHANT_ID;
const SIGNATURE_KEY = process.env.AMARPAY_SIGNATURE_KEY;
const BASE_URL = "https://sandbox.aamarpay.com";
// const redirectUrl = "http://localhost:5000";
// const clientSideUrl = "http://localhost:3000";
const redirectUrl = "https://a-b-server.vercel.app";
const clientSideUrl = "https://www.notebookprokash.com";
// Initialize Payment Route for Combo Orders
router.post("/combo", middlewares_1.verifyUser, (req, res, next) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { amount, transactionId, name, email, phone, orderInfoForStore } =
      req.body;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    if (!amount || !transactionId) {
      return res.status(400).json({ message: "Required fields are missing" });
    }
    const session = yield mongoose_1.default.startSession();
    try {
      session.startTransaction();
      // Create order in DB
      yield model_1.default.create([orderInfoForStore], { session });
      // Prepare payment data
      const paymentData = {
        store_id: MERCHANT_ID || "aamarpaytest",
        signature_key: SIGNATURE_KEY || "dbb74894e82415a2f7ff0ec3a97e4183",
        amount,
        desc: "Combo Order Payment",
        payment_type: "VISA",
        currency: "BDT",
        tran_id: transactionId,
        cus_name: name,
        cus_email: email || "example@gmail.com",
        cus_phone: phone,
        success_url: `${redirectUrl}/payment/success/${transactionId}`,
        fail_url: `${redirectUrl}/payment/fail/${transactionId}`,
        cancel_url: `${clientSideUrl}/checkout`,
        type: "json",
      };
      // Send request to AmarPay
      const response = yield axios_1.default.post(
        `${BASE_URL}/jsonpost.php`,
        paymentData
      );
      if (!response.data.payment_url) {
        throw new Error("Failed to receive payment URL");
      }
      yield session.commitTransaction();
      res.json({ paymentUrl: response.data.payment_url });
    } catch (error) {
      yield session.abortTransaction();
      next(error);
    } finally {
      session.endSession();
    }
  })
);
// Initialize Payment Route
router.post("/regular", middlewares_1.verifyUser, (req, res, next) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { amount, transactionId, name, email, phone, orderInfoForStore } =
      req.body;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    if (!amount || !transactionId) {
      return res.status(400).json({ message: "Required fields are missing" });
    }
    const session = yield mongoose_1.default.startSession();
    try {
      session.startTransaction();
      // Get delivery charge from settings
      const settings = yield settings_model_1.default
        .findOne()
        .session(session);
      const DELIVERY_CHARGE =
        (settings === null || settings === void 0
          ? void 0
          : settings.deliveryCharge) || 60;
      // 1. Recalculate and validate everything
      const cartItems = orderInfoForStore.cart;
      let calculatedTotal = 0;
      for (const item of cartItems) {
        const product = yield model_3.default
          .findById(item._id)
          .session(session);
        if (!product) {
          yield session.abortTransaction();
          return res.status(400).json({ message: `Product not found` });
        }
        let itemTotal = product.sellingPrice * item.quantity;
        // Apply and validate coupon if present
        if (item.couponId) {
          const coupon = yield model_2.Coupon.findById(item.couponId).session(
            session
          );
          if (!coupon) {
            yield session.abortTransaction();
            return res.status(400).json({ message: `Invalid coupon` });
          }
          const now = new Date();
          if (
            !coupon.isActive ||
            now < coupon.startDate ||
            now > coupon.expiryDate
          ) {
            yield session.abortTransaction();
            return res
              .status(400)
              .json({ message: `Coupon ${coupon.code} expired` });
          }
          if (coupon.usedCount >= coupon.usageLimit) {
            yield session.abortTransaction();
            return res
              .status(400)
              .json({ message: `Coupon ${coupon.code} limit exceeded` });
          }
          // Calculate discount
          let discount =
            coupon.discountType === "percentage"
              ? (itemTotal * coupon.discountValue) / 100
              : coupon.discountValue;
          // Apply max discount cap if set
          if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
            discount = coupon.maxDiscountAmount;
          }
          itemTotal -= discount;
        }
        calculatedTotal += itemTotal;
      }
      const amountWithoutDeliveryCharge = amount - DELIVERY_CHARGE;
      // Validate submitted amount matches calculated total
      if (Math.abs(amountWithoutDeliveryCharge - calculatedTotal) > 0.01) {
        yield session.abortTransaction();
        return res.status(400).json({
          message: `Amount mismatch. Expected: ${calculatedTotal} , got ${amountWithoutDeliveryCharge}`,
        });
      }
      // 2. Create order in DB
      yield model_1.default.create([orderInfoForStore], { session });
      // 2. Prepare payment data
      const paymentData = {
        store_id: MERCHANT_ID || "aamarpaytest",
        signature_key: SIGNATURE_KEY || "dbb74894e82415a2f7ff0ec3a97e4183",
        amount,
        desc: "This is description",
        payment_type: "VISA", // or MOBILE_BANKING, etc.
        currency: "BDT",
        tran_id: transactionId,
        cus_name: name,
        cus_email: email || "example@gmail.com",
        cus_phone: phone,
        success_url: `${redirectUrl}/payment/success/${transactionId}`,
        fail_url: `${redirectUrl}/payment/fail/${transactionId}`,
        cancel_url: `${clientSideUrl}/checkout`,
        type: "json",
      };
      // 3. Send request to AmarPay
      const response = yield axios_1.default.post(
        `${BASE_URL}/jsonpost.php`,
        paymentData
      );
      if (!response.data.payment_url) {
        throw new Error("Failed to receive payment URL");
      }
      // 5. Commit transaction
      yield session.commitTransaction();
      // 6. Respond with payment URL
      res.json({ paymentUrl: response.data.payment_url });
    } catch (error) {
      yield session.abortTransaction();
      next(error);
    } finally {
      session.endSession();
    }
  })
);
// Payment Success
router.post("/success/:transactionId", (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const transactionId = req.params.transactionId;
      const order = yield model_1.default.findOneAndUpdate(
        { paymentTnxId: transactionId },
        { $set: { paymentStatus: true } },
        { new: true }
      );
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      // ✅ Clear cart AFTER payment success
      yield cart_model_1.default.findOneAndUpdate(
        { userId: order.user },
        { $set: { cartItems: [] } }
      );
      res.redirect(`${clientSideUrl}/success/${transactionId}`);
    } catch (error) {
      res.status(500).json({ message: "Payment success processing failed" });
    }
  })
);
// Payment Fail
router.post("/fail/:transactionId", (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const transactionId = req.params.transactionId;
      res.redirect(`${clientSideUrl}/fail/${transactionId}`);
    } catch (error) {
      res.status(500).json({ message: "Payment fail processing failed" });
    }
  })
);
exports.default = router;
