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
exports.processMonthlySalaries = exports.releaseMonthlySalaries = exports.recalcUserRank = exports.getMyRank = exports.deleteRank = exports.updateRank = exports.createRank = exports.getRanks = void 0;
const model_1 = require("../settings/model");
const model_2 = require("../user/model");
const model_3 = require("../wallet/model");
const getSettings = () => __awaiter(void 0, void 0, void 0, function* () {
    let s = yield model_1.Settings.findOne();
    if (!s)
        s = yield model_1.Settings.create({});
    return s;
});
// ── rank CRUD (stored in Settings) ───────────────────────────────────────────
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
        const { name, order = 0, requiredGeneration = 1, requiredApprovedSales = 0, reward, salary } = req.body;
        s.ranks.push({ name, order, requiredGeneration, requiredApprovedSales, reward, salary });
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
        const rank = s.ranks.find((r) => r._id.toString() === req.params.id);
        if (!rank)
            return res.status(404).json({ message: "Rank not found" });
        Object.assign(rank, req.body);
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
// ── user rank ─────────────────────────────────────────────────────────────────
const getMyRank = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    try {
        const user = yield model_2.User.findById(req.user._id)
            .select("directSalesCount teamSalesCount currentRank currentRankAchievedAt")
            .lean();
        const s = yield getSettings();
        const allRanks = ((_a = s.ranks) !== null && _a !== void 0 ? _a : []).sort((a, b) => a.order - b.order);
        const currentRankName = (_b = user === null || user === void 0 ? void 0 : user.currentRank) !== null && _b !== void 0 ? _b : null;
        const currentRank = (_c = allRanks.find((r) => r.name === currentRankName)) !== null && _c !== void 0 ? _c : null;
        const nextRank = (_d = allRanks.find((r) => { var _a; return r.order > ((_a = currentRank === null || currentRank === void 0 ? void 0 : currentRank.order) !== null && _a !== void 0 ? _a : -1); })) !== null && _d !== void 0 ? _d : null;
        res.json({
            directSalesCount: (_e = user === null || user === void 0 ? void 0 : user.directSalesCount) !== null && _e !== void 0 ? _e : 0,
            teamSalesCount: (_f = user === null || user === void 0 ? void 0 : user.teamSalesCount) !== null && _f !== void 0 ? _f : 0,
            currentRank,
            nextRank,
            allRanks,
        });
    }
    catch (err) {
        next(err);
    }
});
exports.getMyRank = getMyRank;
// ── called internally after commission distribution ───────────────────────────
// Recalculates user rank based on approved sales; issues reward on first achievement.
const recalcUserRank = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const user = yield model_2.User.findById(userId).select("directSalesCount teamSalesCount currentRank currentRankAchievedAt earnedRanks");
        if (!user)
            return;
        const s = yield model_1.Settings.findOne();
        const ranks = ((_a = s === null || s === void 0 ? void 0 : s.ranks) !== null && _a !== void 0 ? _a : []).sort((a, b) => a.order - b.order);
        // Find highest rank where user's directSalesCount meets requiredApprovedSales
        // (generation depth check is simplified: we use placement depth via teamSalesCount)
        const qualified = ranks.filter((r) => { var _a, _b; return ((_a = user.directSalesCount) !== null && _a !== void 0 ? _a : 0) >= ((_b = r.requiredApprovedSales) !== null && _b !== void 0 ? _b : 0); });
        const newRank = qualified.length ? qualified[qualified.length - 1] : null;
        const newRankName = (_b = newRank === null || newRank === void 0 ? void 0 : newRank.name) !== null && _b !== void 0 ? _b : null;
        if (newRankName && newRankName !== user.currentRank) {
            yield model_2.User.findByIdAndUpdate(userId, {
                currentRank: newRankName,
                currentRankAchievedAt: new Date(),
                $addToSet: { earnedRanks: newRankName },
            });
            // Issue one-time rank reward
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
        const wallet = yield model_3.Wallet.findOne({ userId });
        if (!wallet)
            return;
        wallet.rewardBalance += rank.reward.value;
        yield wallet.save();
        yield model_3.TransactionLog.create({
            userId,
            type: "reward",
            amount: rank.reward.value,
            balanceAfter: wallet.rewardBalance,
            note: `Rank reward: ${rank.name} — ${rank.reward.name} (${rank.reward.type})`,
        });
    });
}
// ── Monthly salary release (call via cron or admin trigger) ──────────────────
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
    var _a, _b, _c, _d, _e;
    const s = yield model_1.Settings.findOne();
    const ranks = ((_a = s === null || s === void 0 ? void 0 : s.ranks) !== null && _a !== void 0 ? _a : []).filter((r) => { var _a; return ((_a = r.salary) === null || _a === void 0 ? void 0 : _a.amount) > 0; });
    if (!ranks.length)
        return 0;
    const now = new Date();
    let count = 0;
    // Users who have earned a rank
    const users = yield model_2.User.find({ currentRank: { $in: ranks.map((r) => r.name) } }).select("currentRank currentRankAchievedAt directSalesCount personalSharesCount totalPersonalPurchaseAmount");
    for (const user of users) {
        const rank = ranks.find((r) => r.name === user.currentRank);
        if (!rank)
            continue;
        const sal = rank.salary;
        const achievedAt = (_b = user.currentRankAchievedAt) !== null && _b !== void 0 ? _b : new Date(0);
        // Salary starts from the month AFTER rank achievement
        const salaryStart = new Date(achievedAt);
        salaryStart.setMonth(salaryStart.getMonth() + 1);
        salaryStart.setDate(1);
        salaryStart.setHours(0, 0, 0, 0);
        if (now < salaryStart)
            continue;
        // Check duration
        const monthsElapsed = Math.floor((now.getTime() - salaryStart.getTime()) / (1000 * 60 * 60 * 24 * 30));
        if (monthsElapsed >= sal.durationMonths)
            continue;
        // Eligibility checks
        const monthlySalesOk = ((_c = user.directSalesCount) !== null && _c !== void 0 ? _c : 0) >= sal.minMonthlySales;
        const personalSharesOk = ((_d = user.personalSharesCount) !== null && _d !== void 0 ? _d : 0) >= sal.requiredPersonalShares;
        const personalPurchaseOk = ((_e = user.totalPersonalPurchaseAmount) !== null && _e !== void 0 ? _e : 0) >= sal.requiredPersonalPurchaseAmount;
        if (!monthlySalesOk || !personalSharesOk || !personalPurchaseOk)
            continue;
        const wallet = yield model_3.Wallet.findOne({ userId: user._id });
        if (!wallet)
            continue;
        wallet.salaryBalance += sal.amount;
        yield wallet.save();
        yield model_3.TransactionLog.create({
            userId: user._id,
            type: "salary",
            amount: sal.amount,
            balanceAfter: wallet.salaryBalance,
            note: `Monthly salary — Rank: ${rank.name}`,
        });
        count++;
    }
    return count;
});
exports.processMonthlySalaries = processMonthlySalaries;
