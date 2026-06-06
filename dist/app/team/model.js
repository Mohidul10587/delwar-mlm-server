"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Team = void 0;
const mongoose_1 = require("mongoose");
const TeamSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    position: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    image: { type: String, default: "" },
    bio: { type: String, default: "" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    department: { type: String, default: "" },
    joinDate: { type: Date, default: Date.now },
    salary: { type: Number, default: 0 },
    address: { type: String, default: "" },
    emergencyContact: { type: String, default: "" },
    skills: [{ type: String }],
    socialLinks: {
        facebook: { type: String, default: "" },
        linkedin: { type: String, default: "" },
        twitter: { type: String, default: "" }
    },
    displayOrder: { type: Number, default: 0 }
}, { timestamps: true });
exports.Team = (0, mongoose_1.model)("Team", TeamSchema);
