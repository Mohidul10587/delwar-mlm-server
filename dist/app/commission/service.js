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
exports.distributeCommission = void 0;
const service_1 = require("../upline/service");
const model_1 = require("../settings/model");
const model_2 = require("../wallet/model");
const model_3 = require("../transaction/model");
const distributeCommission = (userId, amount, reason) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const settings = yield model_1.Settings.findOne();
    if (
      !((_a =
        settings === null || settings === void 0
          ? void 0
          : settings.referralRules) === null || _a === void 0
        ? void 0
        : _a.enabled)
    )
      return;
    const maxLevels = settings.referralRules.maxLevels || 4;
    const levels = settings.referralRules.levels || [];
    const parents = yield (0, service_1.getParentReferrers)(userId, maxLevels);
    for (let i = 0; i < parents.length && i < maxLevels; i++) {
      const levelConfig = levels.find((l) => l.level === i + 1);
      if (!levelConfig) continue;
      const commissionAmount = (amount * levelConfig.commission) / 100;
      const parentId = parents[i];
      const wallet = yield model_2.Wallet.findOne({ userId: parentId });
      if (!wallet) continue;
      const previousAmount = wallet.earnedBalance;
      const currentTotal = previousAmount + commissionAmount;
      yield model_2.Wallet.findOneAndUpdate(
        { userId: parentId },
        { $inc: { earnedBalance: commissionAmount } }
      );
      yield model_3.Transaction.create({
        userId: parentId,
        previousAmount,
        recentAmount: commissionAmount,
        currentTotal,
        description: `Level ${i + 1} Commission`,
      });
    }
  });
exports.distributeCommission = distributeCommission;
