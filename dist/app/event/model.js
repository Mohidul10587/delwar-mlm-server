"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Notification = exports.Event = void 0;
const mongoose_1 = require("mongoose");
const EventSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    description: { type: String, default: "" },
    image: { type: String, default: "" },
    video: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });
const NotificationSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    body: { type: String, required: true },
    isGlobal: { type: Boolean, default: true },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });
exports.Event = (0, mongoose_1.model)("Event", EventSchema);
exports.Notification = (0, mongoose_1.model)("Notification", NotificationSchema);
