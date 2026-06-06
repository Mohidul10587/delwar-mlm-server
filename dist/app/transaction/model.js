"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Transaction = void 0;
const mongoose_1 = require("mongoose");
const TransactionSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    depositId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Deposit" },
    withdrawId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Withdraw" },
    previousAmount: { type: Number, required: true },
    recentAmount: { type: Number, required: true },
    currentTotal: { type: Number, required: true },
    description: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ["credit", "debit"],
        required: true,
    },
}, { timestamps: true });
exports.Transaction = (0, mongoose_1.model)("Transaction", TransactionSchema);
