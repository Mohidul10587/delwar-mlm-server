"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminSalaryRelease = exports.AdminSalaryConfig = void 0;
const mongoose_1 = require("mongoose");
const AdminSalaryConfigSchema = new mongoose_1.Schema({
    adminId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    monthlySalary: { type: Number, required: true, min: 0 },
}, { timestamps: true });
const AdminSalaryReleaseSchema = new mongoose_1.Schema({
    adminId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, min: 0 },
    month: { type: String, required: true }, // "YYYY-MM"
    releasedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    note: { type: String, default: "" },
}, { timestamps: true });
// Compound unique index: prevent double-releasing salary for same admin+month
AdminSalaryReleaseSchema.index({ adminId: 1, month: 1 }, { unique: true });
exports.AdminSalaryConfig = (0, mongoose_1.model)("AdminSalaryConfig", AdminSalaryConfigSchema);
exports.AdminSalaryRelease = (0, mongoose_1.model)("AdminSalaryRelease", AdminSalaryReleaseSchema);
