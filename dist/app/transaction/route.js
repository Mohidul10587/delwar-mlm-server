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
const express_1 = __importDefault(require("express"));
const controller_1 = require("./controller");
const middlewares_1 = require("../user/middlewares");
const model_1 = __importDefault(require("./model"));
const model_2 = __importDefault(require("../order/model"));
const model_3 = require("../sellerWallet/model");
const model_4 = require("../adminWallet/model");
const model_5 = require("../siteWallet/model");
const model_6 = require("../sellerOrder/model");
const router = express_1.default.Router();
// Route to create a new transaction
router.post("/", middlewares_1.verifyUser, controller_1.createTransaction);
// Route to get all transactions for the authenticated seller
router.get(
  "/getAllSellerTransaction",
  middlewares_1.verSellerTkn,
  controller_1.getSellerTransactions
);
router.get("/adminTnx", middlewares_1.verifyAdmin, controller_1.adminTnx);
router.get("/siteTnx", middlewares_1.verifyAdmin, controller_1.siteTnx);
router.get("/sellerTnx", middlewares_1.verSellerTkn, controller_1.sellerTnx);
// Route to delete a transaction
router.delete(
  "/deleteTransaction/:id",
  middlewares_1.verifyUser,
  controller_1.deleteTransaction
);
router.get("/resetAll", (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const session = yield model_1.default.startSession();
    session.startTransaction();
    try {
      // 1️⃣ Delete all transactions
      yield model_1.default.deleteMany({}, { session });
      // 2️⃣ Delete all orders
      yield model_2.default.deleteMany({}, { session });
      yield model_6.SellerOrder.deleteMany({}, { session });
      // 3️⃣ Reset seller wallets
      yield model_3.SellerWallet.updateMany(
        {},
        { $set: { balance: 0, totalEarned: 0, totalWithdrawn: 0 } },
        { session }
      );
      // 4️⃣ Reset admin wallet
      yield model_4.AdminWallet.updateMany(
        {},
        { $set: { balance: 0, totalIncome: 0 } },
        { session }
      );
      // 5️⃣ Reset site wallet
      yield model_5.SiteWallet.updateMany(
        {},
        { $set: { balance: 0, totalIncome: 0, totalWithdrawn: 0 } },
        { session }
      );
      yield session.commitTransaction();
      session.endSession();
      res.status(200).json({
        success: true,
        message:
          "All transactions, orders, and wallets have been reset successfully",
      });
    } catch (error) {
      yield session.abortTransaction();
      session.endSession();
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  })
);
exports.default = router;
