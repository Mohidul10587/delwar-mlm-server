"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveReport = exports.getReports = exports.createReport = void 0;
const model_1 = require("./model");
const createReport = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const auditorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const { seniorTeamLeaderId, teamLeaderId, trainerId, description } = req.body;
        yield model_1.Report.create({ auditorId, seniorTeamLeaderId, teamLeaderId, trainerId, description });
        res.status(201).json({ message: { en: "Report submitted successfully", bn: "রিপোর্ট সফলভাবে জমা হয়েছে" } });
    }
    catch (error) {
        next(error);
    }
});
exports.createReport = createReport;
const getReports = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const status = req.query.status;
        const query = {};
        if (status)
            query.status = status;
        const [reports, total] = yield Promise.all([
            model_1.Report.find(query)
                .populate("auditorId", "userId name")
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            model_1.Report.countDocuments(query),
        ]);
        res.json({ reports, total, page, pages: Math.ceil(total / limit) });
    }
    catch (error) {
        next(error);
    }
});
exports.getReports = getReports;
const resolveReport = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield model_1.Report.findByIdAndUpdate(req.params.id, { status: "resolved" });
        res.json({ message: { en: "Report resolved", bn: "রিপোর্ট সমাধান হয়েছে" } });
    }
    catch (error) {
        next(error);
    }
});
exports.resolveReport = resolveReport;
