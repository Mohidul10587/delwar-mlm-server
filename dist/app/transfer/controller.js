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
exports.getTransferFee = exports.sendTransfer = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const model_1 = require("../wallet/model");
const model_2 = require("../ledger/model");
const model_3 = require("../settings/model");
const model_4 = require("../user/model");
const TRANSFERABLE_FIELDS = [
    "directCommissionBalance",
    "manCommFromDownPayment",
    "manCommFromInstallment",
    "salaryBalance",
    "rewardBalance",
    "transferBalance",
];
const findOrCreateWallet = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    let wallet = yield model_1.Wallet.findOne({ userId });
    if (!wallet)
        wallet = yield model_1.Wallet.create({
            userId,
            totalBalance: 0,
            directCommissionBalance: 0,
            manCommFromDownPayment: 0,
            manCommFromInstallment: 0,
            salaryBalance: 0,
            rewardBalance: 0,
            incentiveBonus: 0,
            transferBalance: 0,
        });
    return wallet;
});
/**
 * POST /transfer
 * Body: { receiverUsername, amount, sourceBalance }
 * sourceBalance: one of the TRANSFERABLE_FIELDS
 */
const sendTransfer = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const senderId = req.user._id.toString();
        const { receiverUsername, amount, sourceBalance } = req.body;
        // ── Validate inputs ─────────────────────────────────────────────────
        if (!receiverUsername || !amount || !sourceBalance) {
            yield session.abortTransaction();
            return res.status(400).json({ message: "receiverUsername, amount and sourceBalance are required" });
        }
        const transferAmount = Number(amount);
        if (isNaN(transferAmount) || transferAmount <= 0) {
            yield session.abortTransaction();
            return res.status(400).json({ message: "Amount must be greater than 0" });
        }
        if (!TRANSFERABLE_FIELDS.includes(sourceBalance)) {
            yield session.abortTransaction();
            return res.status(400).json({ message: "Invalid source balance type" });
        }
        // ── Find receiver ────────────────────────────────────────────────────
        const receiver = yield model_4.User.findOne({ username: receiverUsername }).lean();
        if (!receiver) {
            yield session.abortTransaction();
            return res.status(404).json({ message: "Receiver not found" });
        }
        if (receiver._id.toString() === senderId) {
            yield session.abortTransaction();
            return res.status(400).json({ message: "You cannot transfer to yourself" });
        }
        // ── Get fee rate from settings ───────────────────────────────────────
        const settings = yield model_3.Settings.findOne().lean();
        const feePercent = (_a = settings === null || settings === void 0 ? void 0 : settings.balanceTransferFeePercent) !== null && _a !== void 0 ? _a : 0;
        const feeAmount = parseFloat(((transferAmount * feePercent) / 100).toFixed(2));
        const totalDeduction = parseFloat((transferAmount + feeAmount).toFixed(2));
        // ── Check sender balance ─────────────────────────────────────────────
        const senderWallet = yield findOrCreateWallet(senderId);
        const senderAvailable = senderWallet[sourceBalance];
        if (senderAvailable < totalDeduction) {
            yield session.abortTransaction();
            return res.status(400).json({
                message: `Insufficient balance. You need ৳${totalDeduction.toLocaleString()} (৳${transferAmount} + ৳${feeAmount} fee) but have ৳${senderAvailable.toLocaleString()} in this balance.`,
            });
        }
        // ── Deduct from sender ───────────────────────────────────────────────
        senderWallet[sourceBalance] =
            parseFloat((senderAvailable - totalDeduction).toFixed(2));
        yield senderWallet.save({ session });
        // ── Credit receiver ──────────────────────────────────────────────────
        const receiverWallet = yield findOrCreateWallet(receiver._id.toString());
        receiverWallet.transferBalance = parseFloat((((_b = receiverWallet.transferBalance) !== null && _b !== void 0 ? _b : 0) + transferAmount).toFixed(2));
        yield receiverWallet.save({ session });
        const now = new Date();
        // ── Sender transaction log ───────────────────────────────────────────
        yield model_1.TransactionLog.create([{
                userId: senderId,
                type: "transfer_sent",
                amount: totalDeduction,
                balanceAfter: senderWallet.totalBalance,
                note: `Transferred ৳${transferAmount} to @${receiver.username} (fee: ৳${feeAmount}, rate: ${feePercent}%)`,
                createdAt: now,
            }], { session });
        // ── Receiver transaction log ─────────────────────────────────────────
        yield model_1.TransactionLog.create([{
                userId: receiver._id.toString(),
                type: "transfer_received",
                amount: transferAmount,
                balanceAfter: receiverWallet.totalBalance,
                note: `Received ৳${transferAmount} from @${req.user.username}`,
                createdAt: now,
            }], { session });
        // ── Company ledger (fee income) ──────────────────────────────────────
        if (feeAmount > 0) {
            yield model_2.CompanyLedger.create([{
                    date: now,
                    type: "transfer_fee_received",
                    amount: feeAmount,
                    userId: senderId,
                    note: `Transfer fee from @${req.user.username} → @${receiver.username} (${feePercent}% of ৳${transferAmount})`,
                }], { session });
        }
        yield session.commitTransaction();
        res.json({
            message: `Successfully transferred ৳${transferAmount} to @${receiver.username}. Fee: ৳${feeAmount}.`,
            transferred: transferAmount,
            fee: feeAmount,
            totalDeducted: totalDeduction,
        });
    }
    catch (err) {
        yield session.abortTransaction();
        next(err);
    }
    finally {
        session.endSession();
    }
});
exports.sendTransfer = sendTransfer;
/**
 * GET /transfer/fee — returns current transfer fee percent for the UI
 */
const getTransferFee = (_req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const settings = yield model_3.Settings.findOne().lean();
        res.json({ feePercent: (_a = settings === null || settings === void 0 ? void 0 : settings.balanceTransferFeePercent) !== null && _a !== void 0 ? _a : 0 });
    }
    catch (err) {
        next(err);
    }
});
exports.getTransferFee = getTransferFee;
