"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cookieOpts = exports.JWT_REFRESH_SECRET = exports.JWT_SECRET = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
/**
 * Central config — JWT secrets and cookie options.
 * Throws at startup if required env vars are missing.
 */
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
