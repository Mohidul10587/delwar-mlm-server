"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AffiliateWallet = void 0;
const mongoose_1 = require("mongoose");
const AffiliateWalletSchema = new mongoose_1.Schema({
    affiliate: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        unique: true,
    },
    balance: { type: Number, default: 0 },
    totalEarned: { type: Number, default: 0 },
    totalWithdrawn: { type: Number, default: 0 },
}, { timestamps: true });
AffiliateWalletSchema.index({ affiliate: 1 }, { unique: true });
exports.AffiliateWallet = (0, mongoose_1.model)("AffiliateWallet", AffiliateWalletSchema);
