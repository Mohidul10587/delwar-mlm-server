"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTodayTasksForUser =
  exports.generateTasksForAllActiveShares =
  exports.generateDailyTasks =
    void 0;
const model_1 = require("./model");
const model_2 = require("../packagePurchase/model");
const mongoose_1 = __importDefault(require("mongoose"));
// Generate 5 daily tasks for a package purchase
const generateDailyTasks = (userId, packagePurchaseId, dailyIncome) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const taskReward = dailyIncome / 5;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tasks = [];
    for (let i = 1; i <= 5; i++) {
      tasks.push({
        userId,
        packagePurchaseId,
        taskNumber: i,
        reward: taskReward,
        assignedDate: today,
        isCompleted: false,
      });
    }
    yield model_1.ShareTask.insertMany(tasks, { ordered: false }).catch(
      () => {}
    );
  });
exports.generateDailyTasks = generateDailyTasks;
// Auto-generate tasks for all active shares (run daily via cron)
const generateTasksForAllActiveShares = () =>
  __awaiter(void 0, void 0, void 0, function* () {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const activeShares = yield model_2.SharePurchase.find({
      expiresAt: { $gt: new Date() },
    });
    for (const pkg of activeShares) {
      const existingTasks = yield model_1.ShareTask.countDocuments({
        packagePurchaseId: pkg._id,
        assignedDate: today,
      });
      if (existingTasks === 0) {
        yield (0, exports.generateDailyTasks)(
          new mongoose_1.default.Types.ObjectId(pkg.userId),
          pkg._id,
          pkg.dailyIncome
        );
      }
    }
  });
exports.generateTasksForAllActiveShares = generateTasksForAllActiveShares;
// Get today's tasks for a user
const getTodayTasksForUser = (userId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tasks = yield model_1.ShareTask.find({
      userId,
      assignedDate: today,
    }).populate("packagePurchaseId");
    return tasks;
  });
exports.getTodayTasksForUser = getTodayTasksForUser;
