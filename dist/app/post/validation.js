"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPostSchema = void 0;
const zod_1 = require("zod");
exports.createPostSchema = zod_1.z.object({
    content: zod_1.z.string().min(1, "Content is required"),
    media: zod_1.z
        .array(zod_1.z.object({
        type: zod_1.z.enum(["image", "video"]),
        url: zod_1.z.url(),
    }))
        .optional(),
});
