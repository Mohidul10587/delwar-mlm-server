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
const model_3 = require("../branch/model");
const createWithdrawal = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g;
    try {
        const { amount, method, 
        // bank
        bankAccount, 
        // mobile
        mobileType, mobileNumber, mobileAccountName, 
        // cash / branch
        branchId, 
        // legacy
        accountDetails, } = req.body;
        const amt = Number(amount);
        if (isNaN(amt) || amt <= 0)
            return res.status(400).json({ message: "Amount must be greater than 0" });
        // ── Validate per method ──────────────────────────────────────────────
        if (method === "bank") {
            if (!(bankAccount === null || bankAccount === void 0 ? void 0 : bankAccount.bankName) || !(bankAccount === null || bankAccount === void 0 ? void 0 : bankAccount.accountNumber))
                return res
                    .status(400)
                    .json({ message: "Bank account details required" });
        }
        else if (method === "mobile") {
            if (!mobileType || !mobileNumber)
                return res
                    .status(400)
                    .json({ message: "Mobile type and number required" });
        }
        else if (method === "cash" || method === "branch") {
            if (!branchId)
                return res
                    .status(400)
                    .json({ message: "Branch is required for cash withdrawal" });
        }
        else {
            // legacy methods: bkash / nagad / rocket / bank (old)
            if (!accountDetails)
                return res.status(400).json({ message: "Account details required" });
        }
        // ── Resolve branch name ──────────────────────────────────────────────
        let branchName;
        const isCash = method === "cash" || method === "branch";
        if (isCash && branchId) {
            const branchDoc = yield model_3.Branch.findById(branchId).lean();
            if (!branchDoc)
                return res.status(404).json({ message: "Selected branch not found" });
            branchName = branchDoc.name;
        }
        // ── Balance check ────────────────────────────────────────────────────
        const wallet = yield model_2.Wallet.findOne({ userId: req.user._id });
        if (!wallet)
            return res.status(404).json({ message: "Wallet not found" });
        const loanAmount = (_a = wallet.loanAmount) !== null && _a !== void 0 ? _a : 0;
        const withdrawableBalance = ((_b = wallet.directCommissionBalance) !== null && _b !== void 0 ? _b : 0) +
            ((_c = wallet.manCommFromDownPayment) !== null && _c !== void 0 ? _c : 0) +
            ((_d = wallet.manCommFromInstallment) !== null && _d !== void 0 ? _d : 0) +
            ((_e = wallet.salaryBalanceFromRanks) !== null && _e !== void 0 ? _e : 0) +
            ((_f = wallet.transferBalance) !== null && _f !== void 0 ? _f : 0) -
            loanAmount;
        if (withdrawableBalance < amt)
            return res.status(400).json({ message: "Insufficient balance" });
        // ── Compute per-field deductions ─────────────────────────────────────
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
            const available = (_g = wallet[field]) !== null && _g !== void 0 ? _g : 0;
            const deduct = Math.min(available, remaining);
            if (deduct > 0) {
                deductions[field] = deduct;
                remaining -= deduct;
            }
        }
        const incPayload = { totalBalance: -amt };
        for (const [field, deduct] of Object.entries(deductions)) {
            incPayload[field] = -deduct;
        }
        const updated = yield model_2.Wallet.findOneAndUpdate({ _id: wallet._id, totalBalance: { $gte: amt + loanAmount } }, { $inc: incPayload }, { new: true });
        if (!updated)
            return res.status(400).json({ message: "Insufficient balance" });
        // ── Build note & accountDetails string ───────────────────────────────
        let noteDetail;
        let legacyAccountDetails = accountDetails !== null && accountDetails !== void 0 ? accountDetails : "";
        if (method === "bank") {
            noteDetail = `Bank: ${bankAccount.bankName} — ${bankAccount.accountNumber}`;
            legacyAccountDetails = `${bankAccount.bankName} — ${bankAccount.accountName} — ${bankAccount.accountNumber}`;
        }
        else if (method === "mobile") {
            noteDetail = `${mobileType.toUpperCase()}: ${mobileNumber}`;
            legacyAccountDetails = `${mobileType.toUpperCase()} — ${mobileNumber}`;
        }
        else if (isCash) {
            noteDetail = `Branch: ${branchName}`;
            legacyAccountDetails = "";
        }
        else {
            noteDetail = `${method.toUpperCase()}: ${accountDetails}`;
        }
        yield model_2.TransactionLog.create({
            userId: req.user._id,
            type: "withdrawal",
            amount: amt,
            balanceAfter: updated.totalBalance,
            note: `Withdrawal request — ৳${amt.toLocaleString()} via ${noteDetail}`,
        });
        // ── Create withdrawal document ───────────────────────────────────────
        const withdrawal = yield model_1.Withdrawal.create({
            userId: req.user._id,
            amount: amt,
            method,
            // bank
            bankAccount: method === "bank" ? bankAccount : undefined,
            // mobile
            mobileType: method === "mobile" ? mobileType : undefined,
            mobileNumber: method === "mobile" ? mobileNumber : undefined,
            mobileAccountName: method === "mobile" ? mobileAccountName : undefined,
            // cash
            branch: isCash ? branchName : undefined,
            branchId: isCash ? branchId : undefined,
            // legacy
            accountDetails: legacyAccountDetails,
            deductionBreakdown: deductions,
        });
        res
            .status(201)
            .json({ message: "Withdrawal request submitted", withdrawal });
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
        // Branch manager sees only withdrawals routed to their branch
        let filter = {};
        if (req.user.role === "branch_manager") {
            const branch = yield model_3.Branch.findOne({ managerId: req.user._id }).lean();
            if (!branch) {
                return res.json({ withdrawals: [], total: 0, page, pages: 0 });
            }
            filter = { branchId: branch._id };
        }
        const [withdrawals, total] = yield Promise.all([
            model_1.Withdrawal.find(filter)
                .populate("userId", "name username phone")
                .populate("branchId", "name address")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            model_1.Withdrawal.countDocuments(filter),
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
    var _a, _b, _c, _d, _e, _f, _g, _h;
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
                    const incPayload = {
                        totalBalance: withdrawal.amount,
                    };
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
                const isCashMethod = withdrawal.method === "cash" || withdrawal.method === "branch";
                const restoredWallet = yield model_2.Wallet.findById(wallet._id).lean();
                yield model_2.TransactionLog.create({
                    userId: withdrawal.userId,
                    type: "withdrawal_rejected",
                    amount: withdrawal.amount,
                    balanceAfter: (_b = restoredWallet === null || restoredWallet === void 0 ? void 0 : restoredWallet.totalBalance) !== null && _b !== void 0 ? _b : 0,
                    note: `Withdrawal rejected — ৳${withdrawal.amount.toLocaleString()} via ${withdrawal.method}${isCashMethod
                        ? ` (${withdrawal.branch})`
                        : withdrawal.method === "mobile"
                            ? ` (${(_c = withdrawal.mobileType) === null || _c === void 0 ? void 0 : _c.toUpperCase()}: ${withdrawal.mobileNumber})`
                            : withdrawal.bankAccount
                                ? ` (${withdrawal.bankAccount.bankName} — ${withdrawal.bankAccount.accountNumber})`
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
            const wUser = (yield model_1.Withdrawal.findById(withdrawal._id)
                .populate("userId", "name username")
                .lean());
            const uName = (_e = (_d = wUser === null || wUser === void 0 ? void 0 : wUser.userId) === null || _d === void 0 ? void 0 : _d.name) !== null && _e !== void 0 ? _e : "";
            const uUsername = (_g = (_f = wUser === null || wUser === void 0 ? void 0 : wUser.userId) === null || _f === void 0 ? void 0 : _f.username) !== null && _g !== void 0 ? _g : "";
            const isCashMethod = withdrawal.method === "cash" || withdrawal.method === "branch";
            const dest = isCashMethod
                ? `Branch: ${withdrawal.branch}`
                : withdrawal.method === "mobile"
                    ? `${(_h = withdrawal.mobileType) === null || _h === void 0 ? void 0 : _h.toUpperCase()}: ${withdrawal.mobileNumber}`
                    : withdrawal.bankAccount
                        ? `Bank: ${withdrawal.bankAccount.bankName} — ${withdrawal.bankAccount.accountNumber}`
                        : `${withdrawal.method.toUpperCase()}: ${withdrawal.accountDetails}`;
        }
        res.json({ message: `Withdrawal ${status}`, withdrawal });
    }
    catch (err) {
        next(err);
    }
});
exports.updateWithdrawalStatus = updateWithdrawalStatus;
