"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PendingCommission = void 0;
const mongoose_1 = require("mongoose");
const PendingCommissionSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    purchaseId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Purchase", required: true },
    type: { type: String, enum: ["down_payment_managerial", "installment_managerial"], required: true },
    amount: { type: Number, required: true },
    generation: { type: Number, required: true },
    note: { type: String, default: "" },
    status: { type: String, enum: ["pending", "released"], default: "pending", index: true },
    batchDate: { type: String, required: true, index: true }, // "YYYY-MM-DD"
    batchId: { type: String, required: true, index: true }, // same as batchDate for now
    releasedAt: { type: Date },
    releasedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });
// Compound indexes for batch queries
PendingCommissionSchema.index({ batchId: 1, status: 1 });
PendingCommissionSchema.index({ userId: 1, status: 1 });
PendingCommissionSchema.index({ batchDate: 1, status: 1 });
exports.PendingCommission = (0, mongoose_1.model)("PendingCommission", PendingCommissionSchema);
