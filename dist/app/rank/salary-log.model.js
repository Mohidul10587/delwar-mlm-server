"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RankSalaryLog = void 0;
const mongoose_1 = require("mongoose");
const RankSalaryLogSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    rankName: { type: String, required: true },
    year: { type: Number, required: true },
    month: { type: Number, required: true },
}, { timestamps: true });
RankSalaryLogSchema.index({ userId: 1, rankName: 1, year: 1, month: 1 }, { unique: true });
exports.RankSalaryLog = (0, mongoose_1.model)("RankSalaryLog", RankSalaryLogSchema);
