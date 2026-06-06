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
exports.claimDailyIncome =
  exports.getMyShares =
  exports.getAllPurchases =
  exports.purchaseShare =
    void 0;
const model_1 = require("./model");
const model_2 = require("../package/model");
const model_3 = require("../wallet/model");
const model_4 = require("../transaction/model");
const model_5 = require("../user/model");
const commission_service_1 = require("../package/commission.service");
// User: Purchase package
const purchaseShare = (req, res, next) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const { packageId } = req.body;
      const userId = req.user._id;
      const user = yield model_5.User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: { en: "User not found" } });
      }
      const pkg = yield model_2.Share.findById(packageId);
      if (!pkg) {
        return res.status(404).json({ message: { en: "Share not found" } });
      }
      const wallet = yield model_3.Wallet.findOne({ userId: user._id });
      if (!wallet || wallet.depositedBalance < pkg.price) {
        return res
          .status(400)
          .json({ message: { en: "Insufficient balance" } });
      }
      const previousBalance = wallet.depositedBalance;
      wallet.depositedBalance -= pkg.price;
      yield wallet.save();
      // Set expiry to end of day (23:59:59) after validityDays
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + pkg.validityDays);
      expiresAt.setHours(23, 59, 59, 999);
      const purchase = yield model_1.SharePurchase.create({
        userId,
        packageId: pkg._id.toString(),
        price: pkg.price,
        dailyIncome: pkg.dailyIncome,
        validityDays: pkg.validityDays,
        expiresAt,
      });
      yield model_4.Transaction.create({
        userId: user._id,
        previousAmount: previousBalance,
        recentAmount: -pkg.price,
        currentTotal: wallet.depositedBalance,
        description: "Share Purchase",
        type: "debit",
      });
      yield (0,
      commission_service_1.distributeShareCommission)(user._id, pkg.price, pkg.commissionLevels);
      // Don't generate tasks immediately - wait for cron job next day
      res.json({
        message: { en: "Share purchased successfully!" },
        purchase,
      });
    } catch (error) {
      next(error);
    }
  });
exports.purchaseShare = purchaseShare;
// Admin: Get all purchases
const getAllPurchases = (req, res, next) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const purchases = yield model_1.SharePurchase.find()
        .populate("userId", "name username userId")
        .populate("packageId", "title price")
        .sort({ createdAt: -1 });
      res.json(purchases);
    } catch (error) {
      next(error);
    }
  });
exports.getAllPurchases = getAllPurchases;
// User: Get my active shares
const getMyShares = (req, res, next) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const userId = req.user._id;
      const purchases = yield model_1.SharePurchase.find({
        userId,
        expiresAt: { $gt: new Date() },
      })
        .populate("packageId", "title image price")
        .sort({ createdAt: -1 });
      res.json(purchases);
    } catch (error) {
      next(error);
    }
  });
exports.getMyShares = getMyShares;
// User: Claim daily income
const claimDailyIncome = (req, res, next) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const { purchaseId } = req.params;
      const userId = req.user._id;
      const purchase = yield model_1.SharePurchase.findOne({
        _id: purchaseId,
        userId,
      });
      if (!purchase) {
        return res.status(404).json({ message: { en: "Purchase not found" } });
      }
      if (new Date() > purchase.expiresAt) {
        return res.status(400).json({ message: { en: "Share has expired" } });
      }
      const now = new Date();
      if (purchase.lastClaimedAt) {
        const hoursSinceLastClaim =
          (now.getTime() - purchase.lastClaimedAt.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastClaim < 24) {
          return res.status(400).json({
            message: { en: "You can only claim once per day" },
          });
        }
      }
      const wallet = yield model_3.Wallet.findOne({ userId });
      if (!wallet) {
        return res.status(404).json({ message: { en: "Wallet not found" } });
      }
      const previousBalance = wallet.earnedBalance;
      wallet.earnedBalance += purchase.dailyIncome;
      yield wallet.save();
      purchase.lastClaimedAt = now;
      yield purchase.save();
      yield model_4.Transaction.create({
        userId,
        previousAmount: previousBalance,
        recentAmount: purchase.dailyIncome,
        currentTotal: wallet.earnedBalance,
        description: "Share Refund",
        type: "credit",
      });
      res.json({
        message: { en: "Daily income claimed successfully!" },
        amount: purchase.dailyIncome,
      });
    } catch (error) {
      next(error);
    }
  });
exports.claimDailyIncome = claimDailyIncome;
