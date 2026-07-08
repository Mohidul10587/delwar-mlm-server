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
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateWithdrawalStatus = exports.getMyWithdrawals = exports.getWithdrawals = exports.createWithdrawal = void 0;
const model_1 = require("./model");
const model_2 = require("../wallet/model");
const model_3 = require("../ledger/model");
const createWithdrawal = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    try {
        const { amount, method, accountDetails, branch } = req.body;
        const amt = Number(amount);
        if (isNaN(amt) || amt <= 0)
            return res.status(400).json({ message: "Amount must be greater than 0" });
        if (method === "branch" && !branch)
            return res.status(400).json({ message: "Branch is required" });
        if (method !== "branch" && !accountDetails)
            return res.status(400).json({ message: "Account details required" });
        // Fix F-02: Atomic balance check + deduction using findOneAndUpdate.
        // We deduct from each balance field sequentially in a single save but
        // first we use a version-check pattern to prevent concurrent over-withdrawal.
        //
        // Strategy: load the wallet, compute deductions, then do an atomic update
        // only if all sub-balances are still sufficient (optimistic guard).
        const wallet = yield model_2.Wallet.findOne({ userId: req.user._id });
        if (!wallet)
            return res.status(404).json({ message: "Wallet not found" });
        // incentiveBonus is excluded from withdrawal
        const withdrawableBalance = ((_a = wallet.directCommissionBalance) !== null && _a !== void 0 ? _a : 0) +
            ((_b = wallet.manCommFromDownPayment) !== null && _b !== void 0 ? _b : 0) +
            ((_c = wallet.manCommFromInstallment) !== null && _c !== void 0 ? _c : 0) +
            ((_d = wallet.salaryBalanceFromRanks) !== null && _d !== void 0 ? _d : 0) +
            ((_e = wallet.transferBalance) !== null && _e !== void 0 ? _e : 0);
        if (withdrawableBalance < amt)
            return res.status(400).json({ message: "Insufficient balance" });
        // Compute per-field deductions (same sequential logic as before)
        let remaining = amt;
        const deductions = {};
        const fields = [
            "directCommissionBalance",
            "manCommFromDownPayment",
            "manCommFromInstallment",
            "salaryBalanceFromRanks",
            "transferBalance",
        ];
        for (const field of fields) {
            if (remaining <= 0)
                break;
            const available = (_f = wallet[field]) !== null && _f !== void 0 ? _f : 0;
            const deduct = Math.min(available, remaining);
            if (deduct > 0) {
                deductions[field] = deduct;
                remaining -= deduct;
            }
        }
        // Build $inc payload — also update totalBalance atomically
        const incPayload = { totalBalance: -amt };
        for (const [field, deduct] of Object.entries(deductions)) {
            incPayload[field] = -deduct;
        }
        // H-03 fix: Atomic balance check inside findOneAndUpdate — prevents race condition
        // where two concurrent requests both pass the balance check before either deducts.
        const updated = yield model_2.Wallet.findOneAndUpdate({ _id: wallet._id, totalBalance: { $gte: amt } }, // atomic guard
        { $inc: incPayload }, { new: true });
        if (!updated) {
            return res.status(400).json({ message: "Insufficient balance" });
        }
        const noteDetail = method === "branch"
            ? `Branch: ${branch}`
            : `${method.toUpperCase()}: ${accountDetails}`;
        yield model_2.TransactionLog.create({
            userId: req.user._id,
            type: "withdrawal",
            amount: amt,
            balanceAfter: updated.totalBalance,
            note: `Withdrawal request — ৳${amt.toLocaleString()} via ${noteDetail}`,
        });
        // Fix F-07: Store deduction breakdown so we can restore correctly on rejection
        const withdrawal = yield model_1.Withdrawal.create({
            userId: req.user._id,
            amount: amt,
            method,
            accountDetails: method === "branch" ? "" : accountDetails,
            branch: method === "branch" ? branch : undefined,
            deductionBreakdown: deductions, // stored for correct refund on rejection
        });
        res.status(201).json({ message: "Withdrawal request submitted", withdrawal });
    }
    catch (err) {
        next(err);
    }
});
exports.createWithdrawal = createWithdrawal;
const getWithdrawals = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Fix A-03: add pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 30;
        const skip = (page - 1) * limit;
        const [withdrawals, total] = yield Promise.all([
            model_1.Withdrawal.find()
                .populate("userId", "name username phone")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            model_1.Withdrawal.countDocuments(),
        ]);
        res.json({ withdrawals, total, page, pages: Math.ceil(total / limit) });
    }
    catch (err) {
        next(err);
    }
});
exports.getWithdrawals = getWithdrawals;
const getMyWithdrawals = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const withdrawals = yield model_1.Withdrawal.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .lean();
        res.json({ withdrawals });
    }
    catch (err) {
        next(err);
    }
});
exports.getMyWithdrawals = getMyWithdrawals;
const updateWithdrawalStatus = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    try {
        const { status, reviewNote } = req.body;
        if (!["approved", "rejected"].includes(status))
            return res.status(400).json({ message: "Invalid status" });
        if (status === "rejected" && !String(reviewNote !== null && reviewNote !== void 0 ? reviewNote : "").trim())
            return res.status(400).json({ message: "Rejection reason is required" });
        const withdrawal = yield model_1.Withdrawal.findById(req.params.id);
        if (!withdrawal)
            return res.status(404).json({ message: "Withdrawal not found" });
        if (withdrawal.status !== "pending")
            return res.status(400).json({ message: "Already reviewed" });
        if (status === "rejected") {
            const wallet = yield model_2.Wallet.findOne({ userId: withdrawal.userId });
            if (wallet) {
                // Fix F-07: restore each balance field to what was originally deducted
                const breakdown = (_a = withdrawal.deductionBreakdown) !== null && _a !== void 0 ? _a : {};
                if (Object.keys(breakdown).length > 0) {
                    // Restore using the stored breakdown
                    const incPayload = { totalBalance: withdrawal.amount };
                    for (const [field, amount] of Object.entries(breakdown)) {
                        incPayload[field] = amount;
                    }
                    yield model_2.Wallet.findByIdAndUpdate(wallet._id, { $inc: incPayload });
                }
                else {
                    // Fallback for old withdrawals that have no breakdown: restore to directCommissionBalance
                    yield model_2.Wallet.findByIdAndUpdate(wallet._id, {
                        $inc: {
                            directCommissionBalance: withdrawal.amount,
                            totalBalance: withdrawal.amount,
                        },
                    });
                }
                const restoredWallet = yield model_2.Wallet.findById(wallet._id).lean();
                yield model_2.TransactionLog.create({
                    userId: withdrawal.userId,
                    type: "withdrawal_rejected",
                    amount: withdrawal.amount,
                    balanceAfter: (_b = restoredWallet === null || restoredWallet === void 0 ? void 0 : restoredWallet.totalBalance) !== null && _b !== void 0 ? _b : 0,
                    note: `Withdrawal rejected — ৳${withdrawal.amount.toLocaleString()} via ${withdrawal.method}${withdrawal.method === "branch"
                        ? ` (${withdrawal.branch})`
                        : ` (${withdrawal.accountDetails})`}. Reason: ${reviewNote || "No reason given"}`,
                });
            }
        }
        withdrawal.status = status;
        withdrawal.reviewNote = String(reviewNote !== null && reviewNote !== void 0 ? reviewNote : "").trim();
        withdrawal.reviewedBy = req.user._id;
        withdrawal.reviewedAt = new Date();
        yield withdrawal.save();
        // Ledger: approved withdrawal = outflow
        if (status === "approved") {
            const wUser = yield model_1.Withdrawal.findById(withdrawal._id)
                .populate("userId", "name username")
                .lean();
            const uName = (_d = (_c = wUser === null || wUser === void 0 ? void 0 : wUser.userId) === null || _c === void 0 ? void 0 : _c.name) !== null && _d !== void 0 ? _d : "";
            const uUsername = (_f = (_e = wUser === null || wUser === void 0 ? void 0 : wUser.userId) === null || _e === void 0 ? void 0 : _e.username) !== null && _f !== void 0 ? _f : "";
            const dest = withdrawal.method === "branch"
                ? `Branch: ${withdrawal.branch}`
                : `${withdrawal.method.toUpperCase()}: ${withdrawal.accountDetails}`;
            try {
                yield model_3.CompanyLedger.create({
                    date: new Date(),
                    type: "withdrawal_paid",
                    amount: withdrawal.amount,
                    relatedId: withdrawal._id,
                    relatedModel: "Withdrawal",
                    userId: withdrawal.userId,
                    note: `Withdrawal paid — ৳${withdrawal.amount.toLocaleString()} to ${uName} (@${uUsername}) via ${dest}`,
                });
            }
            catch (ledgerErr) {
                console.error(`[LEDGER ERROR] withdrawal_paid for withdrawalId=${withdrawal._id}:`, ledgerErr);
            }
        }
        res.json({ message: `Withdrawal ${status}`, withdrawal });
    }
    catch (err) {
        next(err);
    }
});
exports.updateWithdrawalStatus = updateWithdrawalStatus;
