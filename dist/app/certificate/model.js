"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Certificate = void 0;
const mongoose_1 = require("mongoose");
const CertificateSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    purchaseId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Purchase", required: true, unique: true },
    shareId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Project", required: true },
    status: { type: String, enum: ["pending", "issued"], default: "pending" },
    issuedAt: { type: Date },
}, { timestamps: true });
exports.Certificate = (0, mongoose_1.model)("Certificate", CertificateSchema);
