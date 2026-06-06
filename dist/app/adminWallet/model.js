"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminWallet = void 0;
const mongoose_1 = require("mongoose");
const AdminWalletSchema = new mongoose_1.Schema({
    admin: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        unique: true,
    },
    balance: { type: Number, default: 0 },
    totalIncome: { type: Number, default: 0 },
}, { timestamps: true });
exports.AdminWallet = (0, mongoose_1.model)("AdminWallet", AdminWalletSchema);
