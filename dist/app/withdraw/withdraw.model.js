"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
// Schema definition
const WithdrawSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    accountNumber: { type: String, required: true },
    withdrawalMethod: { type: String, required: true },
    status: {
        type: String,
        enum: ["Pending", "Rejected", "Approved"],
        required: true,
        default: "Pending",
    },
    rejectionReason: { type: String },
}, { timestamps: true });
// Model definition
const Withdraw = (0, mongoose_1.model)("Withdraw", WithdrawSchema);
exports.default = Withdraw;
