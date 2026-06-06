"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AffApplication = void 0;
const mongoose_1 = require("mongoose");
const AffApplicationSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    bankDetails: {
        accountName: { type: String, required: true },
        accountNumber: { type: String, required: true },
        bankName: { type: String, required: true },
        branchName: { type: String, required: true },
    },
    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
    },
    affiliateCode: { type: String, required: true, unique: true },
    appliedAt: { type: Date, default: Date.now },
    approvedAt: { type: Date },
    approvedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });
exports.AffApplication = (0, mongoose_1.model)("AffApplication", AffApplicationSchema);
