"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const wishlistItemSchema = new mongoose_1.Schema({
    product: { type: mongoose_1.Schema.Types.ObjectId, ref: "Product", required: true },
    addedAt: { type: Date, required: true, default: Date.now },
});
const wishlistSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    items: [wishlistItemSchema],
});
const Wishlist = (0, mongoose_1.model)("Wishlist", wishlistSchema);
exports.default = Wishlist;
