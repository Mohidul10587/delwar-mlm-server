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
exports.clearCart = exports.removeFromCart = exports.updateCartItem = exports.addToCart = exports.getCart = void 0;
const model_1 = require("./model");
const model_2 = require("../product/model");
const getCart = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const cart = yield model_1.Cart.findOne({ userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id }).populate("items.productId");
        if (!cart) {
            return res.json({ items: [] });
        }
        res.json(cart);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching cart" });
    }
});
exports.getCart = getCart;
const addToCart = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const { productId, quantity = 1 } = req.body;
        const product = yield model_2.Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        let cart = yield model_1.Cart.findOne({ userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id });
        if (!cart) {
            cart = new model_1.Cart({ userId: (_b = req.user) === null || _b === void 0 ? void 0 : _b._id, items: [] });
        }
        const existingItem = cart.items.find((item) => item.productId.toString() === productId);
        if (existingItem) {
            existingItem.quantity += quantity;
        }
        else {
            cart.items.push({
                productId,
                quantity,
                price: product.salePrice,
                deliveryChargeInsideDhaka: (_c = product.deliveryChargeInsideDhaka) !== null && _c !== void 0 ? _c : 0,
                deliveryChargeOutsideDhaka: (_d = product.deliveryChargeOutsideDhaka) !== null && _d !== void 0 ? _d : 0,
            });
        }
        yield cart.save();
        yield cart.populate("items.productId");
        res.json(cart);
    }
    catch (error) {
        res.status(500).json({ message: "Error adding to cart" });
    }
});
exports.addToCart = addToCart;
const updateCartItem = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { productId, quantity } = req.body;
        const cart = yield model_1.Cart.findOne({ userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id });
        if (!cart) {
            return res.status(404).json({ message: "Cart not found" });
        }
        const item = cart.items.find((item) => item.productId.toString() === productId);
        if (!item) {
            return res.status(404).json({ message: "Item not found in cart" });
        }
        if (quantity <= 0) {
            cart.items = cart.items.filter((item) => item.productId.toString() !== productId);
        }
        else {
            item.quantity = quantity;
        }
        yield cart.save();
        yield cart.populate("items.productId");
        res.json(cart);
    }
    catch (error) {
        res.status(500).json({ message: "Error updating cart" });
    }
});
exports.updateCartItem = updateCartItem;
const removeFromCart = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { productId } = req.params;
        const cart = yield model_1.Cart.findOne({ userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id });
        if (!cart) {
            return res.status(404).json({ message: "Cart not found" });
        }
        cart.items = cart.items.filter((item) => item.productId.toString() !== productId);
        yield cart.save();
        yield cart.populate("items.productId");
        res.json(cart);
    }
    catch (error) {
        res.status(500).json({ message: "Error removing from cart" });
    }
});
exports.removeFromCart = removeFromCart;
const clearCart = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const cart = yield model_1.Cart.findOne({ userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id });
        if (cart) {
            cart.items = [];
            yield cart.save();
        }
        res.json({ message: "Cart cleared" });
    }
    catch (error) {
        res.status(500).json({ message: "Error clearing cart" });
    }
});
exports.clearCart = clearCart;
