"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SellerWallet = void 0;
const mongoose_1 = require("mongoose");
const SellerWalletSchema = new mongoose_1.Schema({
    seller: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        unique: true,
    },
    balance: { type: Number, default: 0 },
    totalEarned: { type: Number, default: 0 },
    totalWithdrawn: { type: Number, default: 0 },
}, { timestamps: true });
SellerWalletSchema.index({ seller: 1 }, { unique: true });
exports.SellerWallet = (0, mongoose_1.model)("SellerWallet", SellerWalletSchema);
