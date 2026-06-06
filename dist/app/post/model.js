"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Post = void 0;
const mongoose_1 = require("mongoose");
const PostSchema = new mongoose_1.Schema({
    userId: { type: String, required: true },
    content: { type: String, required: true },
    media: [
        {
            type: { type: String, enum: ["image", "video"] },
            url: { type: String },
        },
    ],
}, { timestamps: true });
exports.Post = (0, mongoose_1.model)("Post", PostSchema);
