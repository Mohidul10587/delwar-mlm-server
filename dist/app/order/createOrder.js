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
exports.sslCancel = exports.sslFail = exports.sslSuccess = exports.createDirectOrder = exports.createOrder = exports.buildOrderItems = exports.sslInit = void 0;
const model_1 = require("./model");
const model_2 = require("../product/model");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SSLCommerzPayment = require("sslcommerz-lts");
const sslInit = () => new SSLCommerzPayment(process.env.SSL_STORE_ID, process.env.SSL_STORE_PASSWORD, false);
exports.sslInit = sslInit;
const buildOrderItems = (cartItems, deliveryZone) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    let subtotal = 0;
    let deliveryCharge = 0;
    const orderItems = [];
    for (const item of cartItems) {
        const product = yield model_2.Product.findById(item.productId);
        if (!product)
            throw new Error(`Product not found: ${item.productId}`);
        const price = product.salePrice;
        subtotal += price * item.quantity;
        deliveryCharge +=
            deliveryZone === "inside_dhaka"
                ? (_a = product.deliveryChargeInsideDhaka) !== null && _a !== void 0 ? _a : 0
                : (_b = product.deliveryChargeOutsideDhaka) !== null && _b !== void 0 ? _b : 0;
        orderItems.push({
            productId: product._id,
            title: product.title.en,
            quantity: item.quantity,
            price,
            referrerId: item.referrerId,
        });
    }
    return { subtotal, deliveryCharge, orderItems };
});
exports.buildOrderItems = buildOrderItems;
const buildSslData = (orderId, totalAmount, deliveryAddress, productName, orderId_db) => ({
    total_amount: totalAmount,
    currency: "BDT",
    tran_id: `${orderId}_${Date.now()}`,
    success_url: `${process.env.BACKEND_URL}/order/ssl/success/${orderId_db}`,
    fail_url: `${process.env.BACKEND_URL}/order/ssl/fail/${orderId_db}`,
    cancel_url: `${process.env.BACKEND_URL}/order/ssl/cancel/${orderId_db}`,
    ipn_url: `${process.env.BACKEND_URL}/order/ssl/ipn`,
    shipping_method: "Courier",
    product_name: productName,
    product_category: "General",
    product_profile: "general",
    cus_name: deliveryAddress.fullName,
    cus_email: "customer@example.com",
    cus_add1: deliveryAddress.address,
    cus_city: deliveryAddress.city,
    cus_country: "Bangladesh",
    cus_phone: deliveryAddress.phone,
    ship_name: deliveryAddress.fullName,
    ship_add1: deliveryAddress.address,
    ship_city: deliveryAddress.city,
    ship_postcode: "1000",
    ship_country: "Bangladesh",
});
const createOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { deliveryAddress, billingAddress, deliveryZone, items: cartItems, payment, notes, } = req.body;
        if (!deliveryZone ||
            !["inside_dhaka", "outside_dhaka"].includes(deliveryZone))
            return res.status(400).json({ message: "Invalid delivery zone" });
        if (!(deliveryAddress === null || deliveryAddress === void 0 ? void 0 : deliveryAddress.fullName) ||
            !(deliveryAddress === null || deliveryAddress === void 0 ? void 0 : deliveryAddress.phone) ||
            !(deliveryAddress === null || deliveryAddress === void 0 ? void 0 : deliveryAddress.address) ||
            !(deliveryAddress === null || deliveryAddress === void 0 ? void 0 : deliveryAddress.city))
            return res.status(400).json({ message: "Delivery address is required" });
        if (!(payment === null || payment === void 0 ? void 0 : payment.method) || !["cash", "online"].includes(payment.method))
            return res
                .status(400)
                .json({ message: "Payment method must be cash or online" });
        if (!(cartItems === null || cartItems === void 0 ? void 0 : cartItems.length))
            return res.status(400).json({ message: "Cart is empty" });
        const { subtotal, deliveryCharge, orderItems } = yield (0, exports.buildOrderItems)(cartItems, deliveryZone);
        const orderId = `ORD${Date.now()}`;
        const orderData = {
            userId: ((_a = req.user) === null || _a === void 0 ? void 0 : _a._id) || undefined,
            orderId,
            items: orderItems,
            subtotal,
            deliveryCharge,
            deliveryZone,
            totalAmount: subtotal + deliveryCharge,
            status: "processing",
            deliveryAddress: Object.assign(Object.assign({}, deliveryAddress), { country: "Bangladesh" }),
            billingAddress: billingAddress
                ? Object.assign(Object.assign({}, billingAddress), { country: "Bangladesh" }) : undefined,
            payment: { method: payment.method },
            notes,
        };
        if (payment.method === "cash") {
            const order = yield model_1.Order.create(orderData);
            return res.json({ message: "Order placed successfully", order });
        }
        const order = yield model_1.Order.create(orderData);
        const sslData = buildSslData(orderId, subtotal + deliveryCharge, deliveryAddress, "Order Items", String(order._id));
        const sslResponse = yield (0, exports.sslInit)().init(sslData);
        if (sslResponse === null || sslResponse === void 0 ? void 0 : sslResponse.GatewayPageURL)
            return res.json({
                paymentUrl: sslResponse.GatewayPageURL,
                orderId: order._id,
            });
        if (((_b = sslResponse === null || sslResponse === void 0 ? void 0 : sslResponse.desc) === null || _b === void 0 ? void 0 : _b.length) > 0)
            return res.json({
                paymentUrl: sslResponse.desc[0].redirectGatewayURL,
                orderId: order._id,
            });
        return res.status(500).json({ message: "Failed to initiate payment" });
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : "Error creating order";
        return res.status(500).json({ message: msg });
    }
});
exports.createOrder = createOrder;
const createDirectOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { productId, quantity, deliveryAddress, billingAddress, deliveryZone, payment, notes, } = req.body;
        if (!deliveryZone ||
            !["inside_dhaka", "outside_dhaka"].includes(deliveryZone))
            return res.status(400).json({ message: "Invalid delivery zone" });
        if (!(deliveryAddress === null || deliveryAddress === void 0 ? void 0 : deliveryAddress.fullName) ||
            !(deliveryAddress === null || deliveryAddress === void 0 ? void 0 : deliveryAddress.phone) ||
            !(deliveryAddress === null || deliveryAddress === void 0 ? void 0 : deliveryAddress.address) ||
            !(deliveryAddress === null || deliveryAddress === void 0 ? void 0 : deliveryAddress.city))
            return res.status(400).json({ message: "Delivery address is required" });
        if (!(payment === null || payment === void 0 ? void 0 : payment.method) || !["cash", "online"].includes(payment.method))
            return res
                .status(400)
                .json({ message: "Payment method must be cash or online" });
        if (!productId || !quantity || quantity < 1)
            return res.status(400).json({ message: "Invalid product or quantity" });
        const product = yield model_2.Product.findById(productId);
        if (!product)
            return res.status(404).json({ message: "Product not found" });
        const subtotal = product.salePrice * quantity;
        const deliveryCharge = deliveryZone === "inside_dhaka"
            ? (_a = product.deliveryChargeInsideDhaka) !== null && _a !== void 0 ? _a : 0
            : (_b = product.deliveryChargeOutsideDhaka) !== null && _b !== void 0 ? _b : 0;
        const orderId = `ORD${Date.now()}`;
        const orderData = {
            userId: ((_c = req.user) === null || _c === void 0 ? void 0 : _c._id) || undefined,
            orderId,
            items: [
                {
                    productId: product._id,
                    title: product.title.en,
                    quantity,
                    price: product.salePrice,
                },
            ],
            subtotal,
            deliveryCharge,
            deliveryZone,
            totalAmount: subtotal + deliveryCharge,
            status: "processing",
            deliveryAddress: Object.assign(Object.assign({}, deliveryAddress), { country: "Bangladesh" }),
            billingAddress: billingAddress
                ? Object.assign(Object.assign({}, billingAddress), { country: "Bangladesh" }) : undefined,
            payment: { method: payment.method },
            notes,
        };
        if (payment.method === "cash") {
            const order = yield model_1.Order.create(orderData);
            return res.json({ message: "Order placed successfully", order });
        }
        const order = yield model_1.Order.create(orderData);
        const sslData = buildSslData(orderId, subtotal + deliveryCharge, deliveryAddress, product.title.en, String(order._id));
        const sslResponse = yield (0, exports.sslInit)().init(sslData);
        if (!(sslResponse === null || sslResponse === void 0 ? void 0 : sslResponse.GatewayPageURL))
            return res.status(500).json({ message: "Failed to initiate payment" });
        return res.json({
            paymentUrl: sslResponse.GatewayPageURL,
            orderId: order._id,
        });
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : "Error creating order";
        return res.status(500).json({ message: msg });
    }
});
exports.createDirectOrder = createDirectOrder;
const sslSuccess = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { orderId } = req.params;
        const val_id = (req.query.val_id || req.body.val_id);
        const tran_id = (req.query.tran_id || req.body.tran_id);
        console.log("✅ SSL Success callback received:", { orderId, val_id, tran_id, body: req.body });
        const validation = yield (0, exports.sslInit)().validate({ val_id });
        console.log("🔍 SSL Validation response:", JSON.stringify(validation, null, 2));
        if ((validation === null || validation === void 0 ? void 0 : validation.status) !== "VALID" && (validation === null || validation === void 0 ? void 0 : validation.status) !== "VALIDATED") {
            console.error("❌ Validation failed. Status:", validation === null || validation === void 0 ? void 0 : validation.status);
            return res.redirect(`${process.env.FRONTEND_URL}/payment/fail`);
        }
        yield model_1.Order.findByIdAndUpdate(orderId, {
            "payment.transactionId": tran_id,
            "payment.senderNumber": validation.card_no || "",
            status: "processing",
        });
        console.log("💾 Order updated successfully:", orderId);
        res.redirect(`${process.env.FRONTEND_URL}/payment/success?orderId=${orderId}`);
    }
    catch (err) {
        console.error("🔥 sslSuccess error:", err);
        res.redirect(`${process.env.FRONTEND_URL}/payment/fail`);
    }
});
exports.sslSuccess = sslSuccess;
const sslFail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { orderId } = req.params;
    console.log("❌ SSL Fail callback:", { orderId, body: req.body });
    yield model_1.Order.findByIdAndUpdate(orderId, { status: "cancelled", cancelReason: "Payment failed" });
    res.redirect(`${process.env.FRONTEND_URL}/payment/fail`);
});
exports.sslFail = sslFail;
const sslCancel = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { orderId } = req.params;
    console.log("🚫 SSL Cancel callback:", { orderId, body: req.body });
    yield model_1.Order.findByIdAndUpdate(orderId, { status: "cancelled", cancelReason: "Payment cancelled by user" });
    res.redirect(`${process.env.FRONTEND_URL}/payment/cancel`);
});
exports.sslCancel = sslCancel;
