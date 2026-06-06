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
exports.distributeShareCommission = void 0;
const service_1 = require("../referralChain/service");
const model_1 = require("../wallet/model");
const model_2 = require("../transaction/model");
const distributeShareCommission = (userId, packagePrice, commissionLevels) =>
  __awaiter(void 0, void 0, void 0, function* () {
    if (!commissionLevels || commissionLevels.length === 0) return;
    const maxLevels = commissionLevels.length;
    const parents = yield (0, service_1.getParentReferrers)(userId, maxLevels);
    for (let i = 0; i < parents.length && i < maxLevels; i++) {
      const levelConfig = commissionLevels.find((l) => l.level === i + 1);
      if (!levelConfig) continue;
      const commissionAmount = (packagePrice * levelConfig.commission) / 100;
      const parentId = parents[i];
      const wallet = yield model_1.Wallet.findOne({ userId: parentId });
      if (!wallet) continue;
      const previousAmount = wallet.earnedBalance;
      const currentTotal = previousAmount + commissionAmount;
      yield model_1.Wallet.findOneAndUpdate(
        { userId: parentId },
        { $inc: { earnedBalance: commissionAmount } }
      );
      yield model_2.Transaction.create({
        userId: parentId,
        previousAmount,
        recentAmount: commissionAmount,
        currentTotal,
        description: `Level ${i + 1} Commission`,
        type: "credit",
      });
    }
  });
exports.distributeShareCommission = distributeShareCommission;
