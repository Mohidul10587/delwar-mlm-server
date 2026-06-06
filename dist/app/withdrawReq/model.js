"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WithdrawReq = void 0;
const mongoose_1 = require("mongoose");
const WithdrawReqSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    userType: {
        type: String,
        enum: ["SELLER", "AFFILIATE"],
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    method: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "PaymentMethod",
    },
    status: {
        type: String,
        enum: ["PENDING", "APPROVED", "REJECTED"],
        default: "PENDING",
    },
    processedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
    },
    transactionId: {
        type: String,
    },
    paymentMethod: {
        type: String,
    },
}, { timestamps: true });
WithdrawReqSchema.index({ user: 1, userType: 1 });
WithdrawReqSchema.index({ status: 1 });
exports.WithdrawReq = (0, mongoose_1.model)("WithdrawReq", WithdrawReqSchema);
