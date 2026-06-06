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
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeShareTask = exports.getTodayShareTasks = void 0;
const model_1 = require("./model");
const model_2 = require("../wallet/model");
const model_3 = require("../transaction/model");
const packageTask_service_1 = require("./packageTask.service");
// ================== User Controllers ======================
// Get today's package-based tasks
const getTodayShareTasks = (req, res, next) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
      const userId =
        (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
      const tasks = yield (0, packageTask_service_1.getTodayTasksForUser)(
        userId
      );
      res.status(200).json(tasks);
    } catch (error) {
      next(error);
    }
  });
exports.getTodayShareTasks = getTodayShareTasks;
// Complete package task
const completeShareTask = (req, res, next) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
      const { id } = req.params;
      const userId =
        (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
      const task = yield model_1.ShareTask.findOne({ _id: id, userId });
      if (!task) {
        return res.status(404).json({
          message: { en: "Task not found.", bn: "টাস্ক পাওয়া যায়নি।" },
        });
      }
      if (task.isCompleted) {
        return res.status(400).json({
          message: {
            en: "Task already completed.",
            bn: "টাস্ক ইতিমধ্যে সম্পন্ন হয়েছে।",
          },
        });
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const taskDate = new Date(task.assignedDate);
      taskDate.setHours(0, 0, 0, 0);
      if (taskDate.getTime() !== today.getTime()) {
        return res.status(400).json({
          message: {
            en: "This task has expired.",
            bn: "এই টাস্কের মেয়াদ শেষ হয়ে গেছে।",
          },
        });
      }
      task.isCompleted = true;
      task.completedAt = new Date();
      yield task.save();
      let wallet = yield model_2.Wallet.findOne({ userId });
      if (!wallet) {
        wallet = yield model_2.Wallet.create({
          userId,
          earnedBalance: 0,
        });
      }
      const previousAmount = wallet.earnedBalance;
      wallet.earnedBalance += task.reward;
      yield wallet.save();
      yield model_3.Transaction.create({
        userId,
        previousAmount,
        recentAmount: task.reward,
        currentTotal: wallet.earnedBalance,
        description: "Task Completion",
        type: "credit",
      });
      res.status(200).json({
        message: {
          en: "Task completed! Reward added.",
          bn: "টাস্ক সম্পন্ন! পুরস্কার যোগ করা হয়েছে।",
        },
        reward: task.reward,
      });
    } catch (error) {
      next(error);
    }
  });
exports.completeShareTask = completeShareTask;
