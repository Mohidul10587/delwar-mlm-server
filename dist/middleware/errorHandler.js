"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const zod_1 = require("zod");
const errorHandler = (err, req, res, next) => {
    if (err instanceof zod_1.ZodError) {
        const firstError = err.issues[0].message;
        return res.status(400).json({ message: JSON.parse(firstError) });
    }
    res.status(err.status || 500).json({
        message: err.message || {
            en: "Internal server error",
            bn: "অভ্যন্তরীণ সার্ভার ত্রুটি",
        },
    });
};
exports.errorHandler = errorHandler;
