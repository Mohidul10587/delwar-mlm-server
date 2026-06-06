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
exports.triggerManagerialCommission = exports.triggerTeamCommission = void 0;
const cron_1 = require("./cron");
const triggerTeamCommission = (_req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const processed = yield (0, cron_1.runTeamCommissionCron)();
        res.json({ message: { en: "Team commission processed", bn: "টিম কমিশন প্রসেস হয়েছে" }, processed });
    }
    catch (err) {
        next(err);
    }
});
exports.triggerTeamCommission = triggerTeamCommission;
const triggerManagerialCommission = (_req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const processed = yield (0, cron_1.runManagerialCommissionCron)();
        res.json({ message: { en: "Managerial commission transferred", bn: "ম্যানেজারিয়াল কমিশন ট্রান্সফার হয়েছে" }, processed });
    }
    catch (err) {
        next(err);
    }
});
exports.triggerManagerialCommission = triggerManagerialCommission;
