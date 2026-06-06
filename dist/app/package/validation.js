"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.packageSchema = void 0;
const zod_1 = require("zod");
exports.packageSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, "Title is required"),
    image: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    price: zod_1.z.number().min(0, "Price must be positive"),
    dailyIncome: zod_1.z.number().min(0, "Daily income must be positive"),
    validityDays: zod_1.z.number().int().min(1, "Validity must be at least 1 day"),
    isActive: zod_1.z.boolean().optional(),
    commissionLevels: zod_1.z
        .array(zod_1.z.object({
        level: zod_1.z.number().int().min(1).max(6, "Level must be between 1 and 6"),
        commission: zod_1.z.number().min(0).max(100, "Commission must be between 0 and 100"),
    }))
        .max(6, "Maximum 6 commission levels allowed")
        .refine((levels) => {
        const levelNumbers = levels.map((l) => l.level);
        return new Set(levelNumbers).size === levelNumbers.length;
    }, { message: "Duplicate levels are not allowed" }),
});
