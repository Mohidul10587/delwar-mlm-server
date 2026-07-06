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
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const model_1 = require("../wallet/model");
const model_2 = require("../ledger/model");
const model_3 = require("../settings/model");
const model_4 = require("../user/model");
// Fields that can be drawn from during a transfer, in deduction priority order.
// incentiveBonus and loanBalance are intentionally excluded.
const TRANSFERABLE_FIELDS = [
    "directCommissionBalance",
    "manCommFromDownPayment",
    "manCommFromInstallment",
    "salaryBalance",
    "rewardBalance",
    "adminMonthlySalaryBalance",
    "expenseReimbursementBalance",
    "transferBalance",
];
// Build $inc update that drains fields in priority order up to `needed` total.
function buildDeductionInc(wallet, needed) {
    var _a;
    const inc = {};
    let remaining = needed;
    for (const field of TRANSFERABLE_FIELDS) {
        if (remaining <= 0)
            break;
        const available = (_a = wallet[field]) !== null && _a !== void 0 ? _a : 0;
        if (available <= 0)
            continue;
        const take = Math.min(available, remaining);
        inc[field] = -take;
        remaining -= take;
    }
    if (remaining > 0)
        return null; // not enough across all fields
    inc.totalBalance = -needed;
    return inc;
}
const sendTransfer = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const senderId = req.user._id.toString();
        const { receiverUsername, amount, password } = req.body;
        if (!receiverUsername || !amount) {
            yield session.abortTransaction();
            return res.status(400).json({ message: "receiverUsername and amount are required" });
        }
        if (!password) {
            yield session.abortTransaction();
            return res.status(400).json({ message: "Password is required to confirm transfer" });
        }
        // Verify password
        const senderUser = yield model_4.User.findById(senderId).select("password").lean();
        if (!senderUser) {
            yield session.abortTransaction();
            return res.status(404).json({ message: "Sender not found" });
        }
        const isPasswordValid = yield bcryptjs_1.default.compare(String(password), senderUser.password);
        if (!isPasswordValid) {
            yield session.abortTransaction();
            return res.status(401).json({ message: "Incorrect password. Transfer cancelled." });
        }
        const transferAmount = Number(amount);
        if (isNaN(transferAmount) || transferAmount <= 0) {
            yield session.abortTransaction();
            return res.status(400).json({ message: "Amount must be greater than 0" });
        }
        // Find receiver
        const receiver = yield model_4.User.findOne({ username: receiverUsername }).lean();
        if (!receiver) {
            yield session.abortTransaction();
            return res.status(404).json({ message: "Receiver not found" });
        }
        if (receiver._id.toString() === senderId) {
            yield session.abortTransaction();
            return res.status(400).json({ message: "You cannot transfer to yourself" });
        }
        // Calculate fee
        const settings = yield model_3.Settings.findOne().lean();
        const feePercent = (_a = settings === null || settings === void 0 ? void 0 : settings.balanceTransferFeePercent) !== null && _a !== void 0 ? _a : 0;
        const feeAmount = parseFloat(((transferAmount * feePercent) / 100).toFixed(2));
        const totalDeduction = parseFloat((transferAmount + feeAmount).toFixed(2));
        // Read sender wallet to build deduction plan
        const senderWalletDoc = yield model_1.Wallet.findOne({ userId: senderId }).lean();
        if (!senderWalletDoc) {
            yield session.abortTransaction();
            return res.status(400).json({ message: "Insufficient balance" });
        }
        const incUpdate = buildDeductionInc(senderWalletDoc, totalDeduction);
        if (!incUpdate) {
            yield session.abortTransaction();
            return res.status(400).json({
                message: `Insufficient balance. You need ৳${totalDeduction.toLocaleString()} but only have ৳${((_b = senderWalletDoc.totalBalance) !== null && _b !== void 0 ? _b : 0).toLocaleString()}.`,
            });
        }
        // Apply deduction atomically — also guard totalBalance to prevent race condition
        const updatedSenderWallet = yield model_1.Wallet.findOneAndUpdate({
            userId: senderId,
            totalBalance: { $gte: totalDeduction },
        }, { $inc: incUpdate }, { new: true, session });
        if (!updatedSenderWallet) {
            yield session.abortTransaction();
            return res.status(400).json({ message: "Insufficient balance" });
        }
        // Credit receiver
        const receiverWallet = yield model_1.Wallet.findOneAndUpdate({ userId: receiver._id.toString() }, {
            $inc: { transferBalance: transferAmount, totalBalance: transferAmount },
            $setOnInsert: {
                userId: receiver._id.toString(),
                directCommissionBalance: 0,
                manCommFromDownPayment: 0,
                manCommFromInstallment: 0,
                salaryBalance: 0,
                rewardBalance: 0,
                incentiveBonus: 0,
            },
        }, { upsert: true, new: true, session });
        const now = new Date();
        yield model_1.TransactionLog.create([{
                userId: senderId,
                type: "transfer_sent",
                amount: totalDeduction,
                balanceAfter: updatedSenderWallet.totalBalance,
                note: `Transferred ৳${transferAmount} to @${receiver.username}${feeAmount > 0 ? ` (fee: ৳${feeAmount}, rate: ${feePercent}%)` : ""}`,
                createdAt: now,
            }], { session });
        yield model_1.TransactionLog.create([{
                userId: receiver._id.toString(),
                type: "transfer_received",
                amount: transferAmount,
                balanceAfter: receiverWallet.totalBalance,
                note: `Received ৳${transferAmount} from @${req.user.username}`,
                createdAt: now,
            }], { session });
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
            message: `Successfully transferred ৳${transferAmount} to @${receiver.username}.${feeAmount > 0 ? ` Fee: ৳${feeAmount}.` : ""}`,
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
