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
exports.resetAllFinancialData = void 0;
const model_1 = require("../transaction/model");
const model_2 = require("../deposit/model");
const withdraw_model_1 = __importDefault(require("../withdraw/withdraw.model"));
const model_3 = require("../wallet/model");
const model_4 = require("../packagePurchase/model");
const model_5 = require("../package/model");
const model_6 = require("../task/model");
const resetAllFinancialData = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      // Delete all transactions
      yield model_1.Transaction.deleteMany({});
      // Delete all deposits
      yield model_2.Deposit.deleteMany({});
      // Delete all withdrawal requests
      yield withdraw_model_1.default.deleteMany({});
      yield model_4.SharePurchase.deleteMany({});
      yield model_5.Share.deleteMany({});
      yield model_6.ShareTask.deleteMany({});
      // Reset all wallets to zero
      yield model_3.Wallet.updateMany(
        {},
        {
          $set: {
            earnedBalance: 0,
          },
        }
      );
      res.status(200).json({
        message: "All financial data has been reset successfully",
        deleted: {
          transactions: "All",
          deposits: "All",
          withdrawals: "All",
          walletsReset: "All",
        },
      });
    } catch (error) {
      res.status(500).json({
        message: "Error resetting financial data",
        error,
      });
    }
  });
exports.resetAllFinancialData = resetAllFinancialData;
