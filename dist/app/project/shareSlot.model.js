"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShareSlot = void 0;
const mongoose_1 = require("mongoose");
const ShareSlotSchema = new mongoose_1.Schema({
    shareNumber: { type: String, required: true, unique: true },
    shareId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    status: { type: String, enum: ["available", "sold", "reclaimed"], default: "available", index: true },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", default: null },
    purchaseId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Purchase", default: null },
    reclaimedAt: { type: Date, default: null },
}, { timestamps: true });
// L-06 fix: compound indexes for frequent queries
ShareSlotSchema.index({ shareId: 1, status: 1 });
ShareSlotSchema.index({ purchaseId: 1, status: 1 });
ShareSlotSchema.index({ userId: 1 });
exports.ShareSlot = (0, mongoose_1.model)("ShareSlot", ShareSlotSchema);
