"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Branch = void 0;
const mongoose_1 = require("mongoose");
const BranchSchema = new mongoose_1.Schema({
    name: { type: String, required: true, unique: true },
    address: { type: String, default: "" },
    managerId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });
exports.Branch = (0, mongoose_1.model)("Branch", BranchSchema);
