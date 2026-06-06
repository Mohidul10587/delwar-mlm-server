"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Submission = void 0;
const mongoose_1 = require("mongoose");
const SubmissionSchema = new mongoose_1.Schema({
    studentId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    courseId: { type: mongoose_1.Schema.Types.ObjectId },
    classNumber: { type: Number, required: true },
    imageUrl: { type: String, required: true },
    teacherId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    trainerId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    teamLeaderId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    seniorTeamLeaderId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    status: {
        type: String,
        enum: ["Pending", "Accepted", "Rejected"],
        default: "Pending",
    },
}, { timestamps: true });
exports.Submission = (0, mongoose_1.model)("Submission", SubmissionSchema);
