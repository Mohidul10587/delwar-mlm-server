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
exports.getStats = void 0;
const model_1 = require("../user/model");
const getStats = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [totalUsers, activeUsers, inactiveUsers, studentCount, trainerCount, teacherCount, teamLeaderCount, seniorTeamLeaderCount, hrAdminCount, councilorCount, controllerCount, checkerCount, auditorCount, adminCount,] = yield Promise.all([
            model_1.User.countDocuments(),
            model_1.User.countDocuments({ isActive: true }),
            model_1.User.countDocuments({ isActive: false }),
            model_1.User.countDocuments({ role: "student" }),
            model_1.User.countDocuments({ role: "trainer" }),
            model_1.User.countDocuments({ role: "teacher" }),
            model_1.User.countDocuments({ role: "team-leader" }),
            model_1.User.countDocuments({ role: "senior-team-leader" }),
            model_1.User.countDocuments({ role: "hr-admin" }),
            model_1.User.countDocuments({ role: "councilor" }),
            model_1.User.countDocuments({ role: "controller" }),
            model_1.User.countDocuments({ role: "checker" }),
            model_1.User.countDocuments({ role: "auditor" }),
            model_1.User.countDocuments({ role: "admin" }),
        ]);
        res.json({
            totalUsers,
            activeUsers,
            inactiveUsers,
            studentCount,
            trainerCount,
            teacherCount,
            teamLeaderCount,
            seniorTeamLeaderCount,
            hrAdminCount,
            councilorCount,
            controllerCount,
            checkerCount,
            auditorCount,
            adminCount,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.getStats = getStats;
