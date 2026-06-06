"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRank = exports.Rank = void 0;
const mongoose_1 = require("mongoose");
const RankSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    minDirectSales: { type: Number, default: 0 },
    minTeamSales: { type: Number, default: 0 },
    order: { type: Number, default: 0 },
}, { timestamps: true });
const UserRankSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    rankId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Rank" },
    directSalesCount: { type: Number, default: 0 },
    teamSalesCount: { type: Number, default: 0 },
}, { timestamps: true });
exports.Rank = (0, mongoose_1.model)("Rank", RankSchema);
exports.UserRank = (0, mongoose_1.model)("UserRank", UserRankSchema);
