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
const model_1 = require("../user/model");
const model_2 = require("../wallet/model");
const model_3 = require("../transaction/model");
const model_4 = require("../settings/model");
const distributeCommission = (userId, earnedAmount) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const settings = yield model_4.Settings.findOne();
    if (!settings || !settings.referralRules.enabled) return;
    const user = yield model_1.User.findById(userId);
    if (!user || !user.referredBy) return;
    const levels = settings.referralRules.levels.map((level) => ({
      rate: level.commission / 100,
      reason: `Level ${level.level} Commission`,
    }));
    let currentReferrer = user.referredBy;
    for (let i = 0; i < levels.length; i++) {
      if (!currentReferrer) break;
      const referrer = yield model_1.User.findById(currentReferrer);
      if (!referrer) break;
      const commission = earnedAmount * levels[i].rate;
      const wallet = yield model_2.Wallet.findOne({ userId: currentReferrer });
      if (wallet) {
        const previousBalance = wallet.earnedBalance;
        wallet.earnedBalance += commission;
        yield wallet.save();
        yield model_3.Transaction.create({
          userId: currentReferrer,
          previousAmount: previousBalance,
          recentAmount: commission,
          currentTotal: wallet.earnedBalance,
          description: levels[i].reason,
        });
      }
      currentReferrer = referrer.referredBy;
    }
  });
exports.distributeCommission = distributeCommission;
