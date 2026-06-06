"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferralChain = void 0;
const mongoose_1 = require("mongoose");
const ReferralChainSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    level1: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    level2: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    level3: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    level4: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    level5: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    level6: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });
exports.ReferralChain = (0, mongoose_1.model)("ReferralChain", ReferralChainSchema);
