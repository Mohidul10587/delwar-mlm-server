"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SiteWallet = void 0;
// src/finance/wallets/siteWallet.model.ts
const mongoose_1 = require("mongoose");
const SiteWalletSchema = new mongoose_1.Schema({
    balance: { type: Number, default: 0 },
    totalIncome: { type: Number, default: 0 },
    totalWithdrawn: { type: Number, default: 0 },
}, { timestamps: true });
exports.SiteWallet = (0, mongoose_1.model)("SiteWallet", SiteWalletSchema);
