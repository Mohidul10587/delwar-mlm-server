"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginSchema = exports.adminRegisterSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
const baseSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    username: zod_1.z.string().min(3).regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
    phone: zod_1.z.string().min(10),
    password: zod_1.z.string().min(6),
});
// Public registration: referrer + placement required
exports.registerSchema = baseSchema.extend({
    referrerUsername: zod_1.z.string().min(1),
    placementParentUsername: zod_1.z.string().min(1),
});
// Superadmin registration: referrer + placement optional, role assignable (no superadmin)
exports.adminRegisterSchema = baseSchema.extend({
    referrerUsername: zod_1.z.string().optional(),
    placementParentUsername: zod_1.z.string().optional(),
    role: zod_1.z.enum(["admin", "staff", "user"]).optional().default("user"),
});
exports.loginSchema = zod_1.z.object({
    username: zod_1.z.string().min(1),
    password: zod_1.z.string().min(1),
});
