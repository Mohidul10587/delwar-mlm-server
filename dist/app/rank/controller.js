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
exports.processMonthlySalaries = exports.releaseMonthlySalaries = exports.recalcUserRank = exports.getMyRank = exports.deleteRank = exports.updateRank = exports.createRank = exports.getRanks = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const model_1 = require("../settings/model");
const model_2 = require("../user/model");
const model_3 = require("../purchase/model");
const model_4 = require("../wallet/model");
const salary_log_model_1 = require("./salary-log.model");
const getSettings = () => __awaiter(void 0, void 0, void 0, function* () {
    let s = yield model_1.Settings.findOne();
    if (!s)
        s = yield model_1.Settings.create({});
    return s;
});
// ── Rank CRUD (stored in Settings) ───────────────────────────────────────────
const getRanks = (_req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const s = yield getSettings();
        const ranks = ((_a = s.ranks) !== null && _a !== void 0 ? _a : []).sort((a, b) => a.order - b.order);
        res.json({ ranks });
    }
    catch (err) {
        next(err);
    }
});
exports.getRanks = getRanks;
const createRank = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const s = yield getSettings();
        const { name, order = 0, requiredGeneration = 1, requiredApprovedSales = 0, reward, salary, } = req.body;
        s.ranks.push({
            name,
            order,
            requiredGeneration,
            requiredApprovedSales,
            reward,
            salary,
        });
        s.markModified("ranks");
        yield s.save();
        res.status(201).json({ message: "Rank created", ranks: s.ranks });
    }
    catch (err) {
        next(err);
    }
});
exports.createRank = createRank;
const updateRank = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const s = yield getSettings();
        const idx = s.ranks.findIndex((r) => r._id.toString() === req.params.id);
        if (idx === -1)
            return res.status(404).json({ message: "Rank not found" });
        const rank = s.ranks[idx];
        const { name, order, requiredGeneration, requiredApprovedSales, reward, salary, } = req.body;
        rank.set({
            name,
            order,
            requiredGeneration,
            requiredApprovedSales,
            reward,
            salary,
        });
        s.markModified("ranks");
        yield s.save();
        res.json({ message: "Rank updated", ranks: s.ranks });
    }
    catch (err) {
        next(err);
    }
});
exports.updateRank = updateRank;
const deleteRank = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const s = yield getSettings();
        s.ranks = s.ranks.filter((r) => r._id.toString() !== req.params.id);
        yield s.save();
        res.json({ message: "Rank deleted" });
    }
    catch (err) {
        next(err);
    }
});
exports.deleteRank = deleteRank;
// ── User rank info ────────────────────────────────────────────────────────────
const getMyRank = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const user = yield model_2.User.findById(req.user._id)
            .select("currentRank currentRankAchievedAt earnedRanks")
            .lean();
        const s = yield getSettings();
        const allRanks = ((_a = s.ranks) !== null && _a !== void 0 ? _a : []).sort((a, b) => a.order - b.order);
        const currentRankName = (_b = user === null || user === void 0 ? void 0 : user.currentRank) !== null && _b !== void 0 ? _b : null;
        const currentRank = (_c = allRanks.find((r) => r.name === currentRankName)) !== null && _c !== void 0 ? _c : null;
        const nextRank = (_d = allRanks.find((r) => { var _a; return r.order > ((_a = currentRank === null || currentRank === void 0 ? void 0 : currentRank.order) !== null && _a !== void 0 ? _a : -1); })) !== null && _d !== void 0 ? _d : null;
        res.json({ currentRank, nextRank, allRanks });
    }
    catch (err) {
        next(err);
    }
});
exports.getMyRank = getMyRank;
// ── Core: get total approved sales amount for all network members of a user ───
function getTotalApprovedSales(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const uid = new mongoose_1.default.Types.ObjectId(userId.toString());
        const networkUsers = yield model_2.User.find({
            "generationAncestors.userId": uid,
        })
            .select("_id")
            .lean();
        if (!networkUsers.length)
            return 0;
        const result = yield model_3.Purchase.aggregate([
            {
                $match: {
                    userId: { $in: networkUsers.map((u) => u._id) },
                    status: "approved",
                },
            },
            { $group: { _id: null, total: { $sum: "$amountPaid" } } },
        ]);
        return (_b = (_a = result[0]) === null || _a === void 0 ? void 0 : _a.total) !== null && _b !== void 0 ? _b : 0;
    });
}
// ── Recalculate and update user rank ─────────────────────────────────────────
const recalcUserRank = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const user = yield model_2.User.findById(userId).select("currentRank currentRankAchievedAt earnedRanks");
        if (!user)
            return;
        const s = yield model_1.Settings.findOne();
        const ranks = ((_a = s === null || s === void 0 ? void 0 : s.ranks) !== null && _a !== void 0 ? _a : []).sort((a, b) => a.order - b.order);
        if (!ranks.length)
            return;
        const total = yield getTotalApprovedSales(userId);
        let newRank = null;
        for (const rank of ranks) {
            const threshold = (_b = rank.requiredApprovedSales) !== null && _b !== void 0 ? _b : 0;
            if (threshold > 0 && total >= threshold) {
                newRank = rank;
            }
        }
        const newRankName = (_c = newRank === null || newRank === void 0 ? void 0 : newRank.name) !== null && _c !== void 0 ? _c : null;
        if (newRankName && newRankName !== user.currentRank) {
            yield model_2.User.findByIdAndUpdate(userId, {
                currentRank: newRankName,
                currentRankAchievedAt: new Date(),
                $addToSet: { earnedRanks: newRankName },
            });
            yield issueRankReward(userId, newRank);
        }
    }
    catch (err) {
        console.error("recalcUserRank error:", err);
    }
});
exports.recalcUserRank = recalcUserRank;
function issueRankReward(userId, rank) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (!((_a = rank === null || rank === void 0 ? void 0 : rank.reward) === null || _a === void 0 ? void 0 : _a.value))
            return;
        const wallet = yield model_4.Wallet.findOne({ userId });
        if (!wallet)
            return;
        wallet.rewardBalance += rank.reward.value;
        yield wallet.save();
        yield model_4.TransactionLog.create({
            userId,
            type: "reward",
            amount: rank.reward.value,
            balanceAfter: wallet.rewardBalance,
            note: `Rank reward: ${rank.name} — ${rank.reward.name} (${rank.reward.type})`,
        });
    });
}
// ── Monthly salary release ────────────────────────────────────────────────────
const releaseMonthlySalaries = (_req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const released = yield (0, exports.processMonthlySalaries)();
        res.json({ message: `Salary released for ${released} users` });
    }
    catch (err) {
        next(err);
    }
});
exports.releaseMonthlySalaries = releaseMonthlySalaries;
const processMonthlySalaries = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    const s = yield model_1.Settings.findOne();
    const ranks = ((_a = s === null || s === void 0 ? void 0 : s.ranks) !== null && _a !== void 0 ? _a : []).filter((r) => { var _a; return ((_a = r.salary) === null || _a === void 0 ? void 0 : _a.amount) > 0; });
    if (!ranks.length)
        return 0;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1–12
    // Month boundaries for current-month purchase checks
    const monthStart = new Date(currentYear, currentMonth - 1, 1);
    const monthEnd = new Date(currentYear, currentMonth, 1);
    let count = 0;
    const users = yield model_2.User.find({
        currentRank: { $in: ranks.map((r) => r.name) },
    }).select("_id currentRank currentRankAchievedAt");
    for (const user of users) {
        const rank = ranks.find((r) => r.name === user.currentRank);
        if (!rank)
            continue;
        const sal = rank.salary;
        const achievedAt = (_b = user.currentRankAchievedAt) !== null && _b !== void 0 ? _b : new Date(0);
        // Salary starts from the month AFTER rank achievement
        const salaryStartMonth = new Date(achievedAt);
        salaryStartMonth.setMonth(salaryStartMonth.getMonth() + 1);
        salaryStartMonth.setDate(1);
        salaryStartMonth.setHours(0, 0, 0, 0);
        if (now < salaryStartMonth)
            continue;
        // Check duration: how many salary months have been paid for this rank
        const paidCount = yield salary_log_model_1.RankSalaryLog.countDocuments({
            userId: user._id,
            rankName: rank.name,
        });
        const maxDuration = (_c = sal.durationMonths) !== null && _c !== void 0 ? _c : 3;
        if (paidCount >= maxDuration)
            continue;
        // Dedup: already paid this month for this rank?
        const alreadyPaid = yield salary_log_model_1.RankSalaryLog.findOne({
            userId: user._id,
            rankName: rank.name,
            year: currentYear,
            month: currentMonth,
        });
        if (alreadyPaid)
            continue;
        // ── Condition 1: current-month direct sales (approved purchases where seller's
        //    gen-ancestor[0] is this user, approved this month) ────────────────────
        const monthlySalesResult = yield model_3.Purchase.aggregate([
            {
                $match: {
                    status: "approved",
                    reviewedAt: { $gte: monthStart, $lt: monthEnd },
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "buyer",
                },
            },
            { $unwind: "$buyer" },
            {
                $match: {
                    "buyer.generationAncestors": {
                        $elemMatch: {
                            level: 1,
                            userId: user._id,
                        },
                    },
                },
            },
            {
                $group: { _id: null, count: { $sum: "$quantity" } },
            },
        ]);
        const monthlySalesCount = (_e = (_d = monthlySalesResult[0]) === null || _d === void 0 ? void 0 : _d.count) !== null && _e !== void 0 ? _e : 0;
        if (monthlySalesCount < ((_f = sal.minMonthlySales) !== null && _f !== void 0 ? _f : 0))
            continue;
        // All conditions met — issue salary
        const wallet = yield model_4.Wallet.findOne({ userId: user._id });
        if (!wallet)
            continue;
        wallet.salaryBalance += sal.amount;
        yield wallet.save();
        yield model_4.TransactionLog.create({
            userId: user._id,
            type: "salary",
            amount: sal.amount,
            balanceAfter: wallet.salaryBalance,
            note: `Monthly salary — Rank: ${rank.name} (${currentYear}-${currentMonth})`,
        });
        yield salary_log_model_1.RankSalaryLog.create({
            userId: user._id,
            rankName: rank.name,
            year: currentYear,
            month: currentMonth,
        });
        count++;
    }
    return count;
});
exports.processMonthlySalaries = processMonthlySalaries;
