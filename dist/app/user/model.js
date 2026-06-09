"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = require("mongoose");
const AncestorEntrySchema = new mongoose_1.Schema({
    level: { type: Number, required: true },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    side: { type: String, enum: ["A", "B"] },
}, { _id: false });
const UserSchema = new mongoose_1.Schema({
    username: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["superadmin", "admin", "staff", "user"], default: "user" },
    isActive: { type: Boolean, default: true },
    image: { type: String, default: null },
    linkedPhoneAccounts: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User" }],
    permissions: [{ type: String }],
    generationAncestors: [AncestorEntrySchema],
    placementAncestors: [AncestorEntrySchema],
    directSalesCount: { type: Number, default: 0 },
    teamSalesCount: { type: Number, default: 0 },
    currentRank: { type: String, default: null },
    nominee: {
        type: {
            name: String,
            relation: String,
            phone: String,
            nid: String,
            image: String,
        },
        default: null,
    },
    nominee2: {
        type: {
            name: String,
            relation: String,
            phone: String,
            nid: String,
            image: String,
        },
        default: null,
    },
    district: { type: String, default: null },
    upazila: { type: String, default: null },
    dateOfBirth: { type: String, default: null },
    paymentMethods: {
        type: {
            bank: { type: String, default: null },
            bkash: { type: String, default: null },
            nagad: { type: String, default: null },
            rocket: { type: String, default: null },
        },
        default: null,
    },
}, { timestamps: true });
UserSchema.index({ "placementAncestors.userId": 1 });
exports.User = (0, mongoose_1.model)("User", UserSchema);
