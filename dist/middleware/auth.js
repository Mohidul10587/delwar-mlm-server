"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePermission = exports.verifyStaff = exports.verifyAdmin = exports.verifySuperAdmin = exports.verifyUser = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const model_1 = require("../app/user/model");
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const verifyUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const token = req.cookies.accessToken;
        if (!token)
            return res.status(401).json({ message: "Unauthorized" });
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const user = yield model_1.User.findById(decoded.id);
        if (!user)
            return res.status(401).json({ message: "Unauthorized" });
        if (!user.isActive)
            return res.status(403).json({ message: { en: "Account is disabled", bn: "অ্যাকাউন্ট নিষ্ক্রিয়" } });
        req.user = user;
        next();
    }
    catch (_a) {
        res.status(401).json({ message: "Token expired" });
    }
});
exports.verifyUser = verifyUser;
const verifySuperAdmin = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const token = req.cookies.accessToken;
        if (!token)
            return res.status(401).json({ message: "Unauthorized" });
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const user = yield model_1.User.findById(decoded.id);
        if (!user)
            return res.status(404).json({ message: "User not found" });
        if (!user.isActive)
            return res.status(403).json({ message: { en: "Account is disabled", bn: "অ্যাকাউন্ট নিষ্ক্রিয়" } });
        if (user.role !== "superadmin")
            return res.status(403).json({ message: "Superadmin access required" });
        req.user = user;
        next();
    }
    catch (_a) {
        res.status(401).json({ message: "Invalid token" });
    }
});
exports.verifySuperAdmin = verifySuperAdmin;
const verifyAdmin = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const token = req.cookies.accessToken;
        if (!token)
            return res.status(401).json({ message: "Unauthorized" });
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const user = yield model_1.User.findById(decoded.id);
        if (!user)
            return res.status(404).json({ message: "User not found" });
        if (!user.isActive)
            return res.status(403).json({ message: { en: "Account is disabled", bn: "অ্যাকাউন্ট নিষ্ক্রিয়" } });
        if (!["superadmin", "admin"].includes(user.role))
            return res.status(403).json({ message: "Admin access required" });
        req.user = user;
        next();
    }
    catch (_a) {
        res.status(401).json({ message: "Invalid token" });
    }
});
exports.verifyAdmin = verifyAdmin;
const verifyStaff = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const token = req.cookies.accessToken;
        if (!token)
            return res.status(401).json({ message: "Unauthorized" });
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const user = yield model_1.User.findById(decoded.id);
        if (!user)
            return res.status(404).json({ message: "User not found" });
        if (!user.isActive)
            return res.status(403).json({ message: { en: "Account is disabled", bn: "অ্যাকাউন্ট নিষ্ক্রিয়" } });
        if (!["superadmin", "admin", "staff"].includes(user.role))
            return res.status(403).json({ message: "Staff access required" });
        req.user = user;
        next();
    }
    catch (_a) {
        res.status(401).json({ message: "Invalid token" });
    }
});
exports.verifyStaff = verifyStaff;
const requirePermission = (permission) => {
    return (req, res, next) => {
        const user = req.user;
        if (!user)
            return res.status(401).json({ message: "Unauthorized" });
        if (user.role === "superadmin")
            return next();
        const granted = Array.isArray(user.permissions) && user.permissions.includes(permission);
        if (!granted) {
            return res.status(403).json({
                message: {
                    en: `Permission denied: ${permission}`,
                    bn: `পারমিশন নেই: ${permission}`,
                },
            });
        }
        next();
    };
};
exports.requirePermission = requirePermission;
