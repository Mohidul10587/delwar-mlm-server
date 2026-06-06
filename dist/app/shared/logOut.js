"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logOut = void 0;
const logOut = (req, res) => {
    res.clearCookie("_", {
        path: "/", // Ensure this matches the path where the cookie was set
        httpOnly: true,
        secure: true, // Use `secure: true` in production when using HTTPS
        sameSite: "none", // Adjust based on your needs (e.g., Lax or Strict)
    });
    res.status(200).json({ message: "Logged out successfully" });
};
exports.logOut = logOut;
