"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComboOffer = void 0;
const mongoose_1 = require("mongoose");
const ComboOfferSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    books: [
        {
            product: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: "Product",
                required: true,
            },
            title: { type: String, required: true },
            img: { type: String, required: true },
            sellingPrice: { type: Number, required: true },
        },
    ],
    regularPrice: { type: Number, required: true },
    sellingPrice: { type: Number, required: true },
    discountAmount: { type: Number, required: true },
    discountPercentage: { type: Number, required: true },
    seller: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });
ComboOfferSchema.index({ title: "text" });
exports.ComboOffer = (0, mongoose_1.model)("ComboOffer", ComboOfferSchema);
