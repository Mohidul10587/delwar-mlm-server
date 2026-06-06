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
exports.deleteTransaction = exports.getAllTransactions = exports.createTransaction = void 0;
const model_1 = __importDefault(require("./model"));
// Create a new transaction
const createTransaction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { orderId, amount, date } = req.body;
        const sellerId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id; // Access seller ID from middleware
        const newTransaction = yield model_1.default.create({
            sellerId,
            orderId,
            amount,
            date,
        });
        res.status(201).json({
            message: "AdminTnx created successfully",
            transaction: newTransaction,
        });
    }
    catch (error) {
        res.status(500).json({ message: "Error creating transaction", error });
    }
});
exports.createTransaction = createTransaction;
// Get all transactions for the authenticated seller
const getAllTransactions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const sellerId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id; // Access seller ID from middleware
        const transactions = yield model_1.default.find();
        res.status(200).json({ transactions });
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching transactions", error });
    }
});
exports.getAllTransactions = getAllTransactions;
// Delete a transaction
const deleteTransaction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const sellerId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id; // Access seller ID from middleware
        const transaction = yield model_1.default.findOne({ _id: id, sellerId });
        if (!transaction) {
            return res.status(404).json({ message: "AdminTnx not found" });
        }
        // await transaction.remove();
        res.status(200).json({ message: "AdminTnx deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ message: "Error deleting transaction", error });
    }
});
exports.deleteTransaction = deleteTransaction;
