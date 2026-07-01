"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const zod_1 = require("zod");
const errorHandler = (err, req, res, next) => {
    if (err instanceof zod_1.ZodError) {
        const firstError = err.issues[0].message;
        try {
            return res.status(400).json({ message: JSON.parse(firstError) });
        }
        catch (_a) {
            return res.status(400).json({ message: firstError });
        }
    }
    const statusCode = err.status || err.statusCode || 500;
    const isProduction = process.env.NODE_ENV === "production";
    // In production, never expose internal error messages for 500 errors
    const message = statusCode === 500 && isProduction
        ? { en: "Internal server error", bn: "অভ্যন্তরীণ সার্ভার ত্রুটি" }
        : err.message || { en: "Internal server error", bn: "অভ্যন্তরীণ সার্ভার ত্রুটি" };
    res.status(statusCode).json({ message });
};
exports.errorHandler = errorHandler;
