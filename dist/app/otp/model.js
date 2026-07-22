"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Otp = void 0;
const mongoose_1 = require("mongoose");
const OtpSchema = new mongoose_1.Schema({
    username: { type: String, required: true },
    code: { type: String, required: true },
    purpose: {
        type: String,
        enum: ["register", "forgot-password"],
        required: true,
    },
    expiresAt: { type: Date, required: true },
});
// MongoDB TTL index — expiresAt পার হলে document স্বয়ংক্রিয়ভাবে মুছে যাবে
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
exports.Otp = (0, mongoose_1.model)("Otp", OtpSchema);
