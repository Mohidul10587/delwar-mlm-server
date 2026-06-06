"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTaskSchema = exports.createTaskSchema = void 0;
const zod_1 = require("zod");
exports.createTaskSchema = zod_1.z.object({
    title: zod_1.z.object({
        en: zod_1.z.string().min(1, { message: JSON.stringify({ en: "Title (English) is required", bn: "শিরোনাম (ইংরেজি) প্রয়োজন" }) }),
        bn: zod_1.z.string().optional()
    }),
    img: zod_1.z.string().optional(),
    reward: zod_1.z.number().min(0, { message: JSON.stringify({ en: "Reward must be positive", bn: "পুরস্কার ইতিবাচক হতে হবে" }) }),
    youtubeLink: zod_1.z.string().url().optional().or(zod_1.z.literal(""))
});
exports.updateTaskSchema = exports.createTaskSchema.partial();
