"use strict";
/**
 * Central config — JWT secrets and cookie options.
 * Throws at startup if required env vars are missing.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cookieOpts = exports.JWT_REFRESH_SECRET = exports.JWT_SECRET = void 0;
if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is required");
}
if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error("JWT_REFRESH_SECRET environment variable is required");
}
exports.JWT_SECRET = process.env.JWT_SECRET;
exports.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const cookieOpts = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax"),
});
exports.cookieOpts = cookieOpts;
