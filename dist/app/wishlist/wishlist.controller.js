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
exports.clearWishlist = exports.getWishlist = exports.deleteSingleFromWishlist = exports.addToWishlist = void 0;
const wishlist_model_1 = __importDefault(require("./wishlist.model"));
const mongoose_1 = __importDefault(require("mongoose"));
const addToWishlist = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { productId } = req.body;
    const userId = (_a = req === null || req === void 0 ? void 0 : req.user) === null || _a === void 0 ? void 0 : _a._id;
    if (!mongoose_1.default.Types.ObjectId.isValid(userId) ||
        !mongoose_1.default.Types.ObjectId.isValid(productId)) {
        return res
            .status(400)
            .json({ success: false, message: "Invalid userId or productId" });
    }
    try {
        let wishlist = yield wishlist_model_1.default.findOne({ userId });
        // If no wishlist exists for the user, create a new one
        if (!wishlist) {
            wishlist = yield wishlist_model_1.default.create({
                userId,
                items: [{ product: productId, addedAt: new Date() }], // Add `addedAt` field
            });
        }
        else {
            // Check if the product is already in the wishlist
            const isProductInWishlist = wishlist.items.some((item) => item.product.toString() === productId);
            if (isProductInWishlist) {
                return res
                    .status(400)
                    .json({ success: false, message: "Product already in wishlist" });
            }
            // Add the product to the wishlist
            wishlist.items.push({ product: productId, addedAt: new Date() }); // Add `addedAt` field
            yield wishlist.save();
        }
        return res
            .status(200)
            .json({ success: true, wishlist, message: "Product added to wishlist" });
    }
    catch (error) {
        console.error("Error adding to wishlist:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
});
exports.addToWishlist = addToWishlist;
// Remove a product from the user's wishlist
const deleteSingleFromWishlist = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { productId } = req.params;
    const userId = (_a = req === null || req === void 0 ? void 0 : req.user) === null || _a === void 0 ? void 0 : _a._id;
    if (!mongoose_1.default.Types.ObjectId.isValid(userId) ||
        !mongoose_1.default.Types.ObjectId.isValid(productId)) {
        return res
            .status(400)
            .json({ success: false, message: "Invalid userId or productId" });
    }
    try {
        const wishlist = yield wishlist_model_1.default.findOne({ userId });
        if (!wishlist) {
            return res
                .status(404)
                .json({ success: false, message: "Wishlist not found" });
        }
        // Remove the product from the wishlist
        wishlist.items = wishlist.items.filter((item) => item.product.toString() !== productId);
        yield wishlist.save();
        return res.status(200).json({
            success: true,
            wishlist,
            message: "Product removed from wishlist",
        });
    }
    catch (error) {
        console.error("Error removing from wishlist:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
});
exports.deleteSingleFromWishlist = deleteSingleFromWishlist;
// Get the user's wishlist
const getWishlist = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    try {
        const wishlist = yield wishlist_model_1.default.findOne({ userId }).populate("items.product");
        if (!wishlist) {
            return res.status(200).json({ message: "Wishlist not found" });
        }
        return res.status(200).json(wishlist);
    }
    catch (error) {
        console.error("Error fetching wishlist:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
});
exports.getWishlist = getWishlist;
// Clear the user's wishlist
const clearWishlist = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req === null || req === void 0 ? void 0 : req.user) === null || _a === void 0 ? void 0 : _a._id;
    if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ success: false, message: "Invalid userId" });
    }
    try {
        const wishlist = yield wishlist_model_1.default.findOneAndUpdate({ userId }, { items: [] }, { new: true });
        if (!wishlist) {
            return res
                .status(404)
                .json({ success: false, message: "Wishlist not found" });
        }
        return res
            .status(200)
            .json({ success: true, wishlist, message: "Wishlist cleared" });
    }
    catch (error) {
        console.error("Error clearing wishlist:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
});
exports.clearWishlist = clearWishlist;
