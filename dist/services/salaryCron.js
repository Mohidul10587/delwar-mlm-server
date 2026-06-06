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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startSalaryCron = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const model_1 = require("../app/user/model");
const model_2 = require("../app/wallet/model");
const model_3 = require("../app/transaction/model");
const model_4 = require("../app/settings/model");
const SALARY_ROLES = [
    "admin", "auditor", "checker", "controller", "councilor",
    "hr-admin", "lead-checker", "teacher", "accountant",
];
const startSalaryCron = () => {
    node_cron_1.default.schedule("1 0 1 * *", () => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        try {
            console.log("Starting monthly salary distribution...");
            const settings = yield model_4.Settings.findOne();
            const roleSalaries = settings === null || settings === void 0 ? void 0 : settings.roleSalaries;
            if (!roleSalaries) {
                console.log("No role salaries configured, skipping.");
                return;
            }
            const users = yield model_1.User.find({ role: { $in: SALARY_ROLES }, isActive: true });
            for (const user of users) {
                const salary = (_a = roleSalaries[user.role]) !== null && _a !== void 0 ? _a : 0;
                if (salary <= 0)
                    continue;
                let wallet = yield model_2.Wallet.findOne({ userId: user._id });
                const previousEarned = wallet ? wallet.earnedBalance : 0;
                if (!wallet) {
                    wallet = yield model_2.Wallet.create({ userId: user._id, earnedBalance: salary });
                }
                else {
                    wallet.earnedBalance += salary;
                    yield wallet.save();
                }
                yield model_3.Transaction.create({
                    userId: user._id,
                    previousAmount: previousEarned,
                    recentAmount: salary,
                    currentTotal: wallet.earnedBalance,
                    description: `Monthly Salary - ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}`,
                    type: "credit",
                });
                console.log(`Salary distributed to ${user.name} (${user.role}): ৳${salary}`);
            }
            console.log("Monthly salary distribution completed");
        }
        catch (error) {
            console.error("Error distributing salaries:", error);
        }
    }));
    console.log("Salary cron job initialized");
};
exports.startSalaryCron = startSalaryCron;
