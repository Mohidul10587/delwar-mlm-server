"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTransactionSchema = exports.createTransactionSchema = void 0;
const zod_1 = require("zod");
exports.createTransactionSchema = zod_1.z.object({
    title: zod_1.z.object({
        en: zod_1.z.string().min(1, { message: JSON.stringify({ en: "Title (English) is required", bn: "শিরোনাম (ইংরেজি) প্রয়োজন" }) }),
        bn: zod_1.z.string().optional()
    }),
    img: zod_1.z.string().optional()
});
exports.updateTransactionSchema = exports.createTransactionSchema.partial();
