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
exports.processMonthlySalaries = exports.releaseMonthlySalaries = exports.recalcUserRank = exports.getMyRank = exports.deleteRank = exports.replaceAllRanks = exports.updateRank = exports.createRank = exports.getRanks = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const model_1 = require("../settings/model");
const model_2 = require("../user/model");
const model_3 = require("../purchase/model");
const model_4 = require("../wallet/model");
const salary_log_model_1 = require("./salary-log.model");
const model_5 = require("../ledger/model");
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
        const ranks = ((_a = s.ranks) !== null && _a !== void 0 ? _a : []);
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
        const { name, requiredGeneration = 1, minNetworkSalesAmount = 0, reward, salary, } = req.body;
        // M-13 fix: prevent duplicate rank names
        if (!name || !String(name).trim()) {
            return res.status(400).json({ message: "Rank name is required" });
        }
        const exists = s.ranks.some((r) => { var _a; return ((_a = r.name) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === String(name).trim().toLowerCase(); });
        if (exists) {
            return res.status(400).json({ message: `A rank named "${name}" already exists` });
        }
        s.ranks.push({
            name: String(name).trim(),
            requiredGeneration,
            minNetworkSalesAmount,
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
        // First 2 ranks are locked and cannot be updated
        if (idx < 2)
            return res.status(403).json({ message: "This rank is locked and cannot be edited" });
        const { name, minNetworkSalesAmount, reward, salary, } = req.body;
        s.ranks[idx] = Object.assign(Object.assign({}, s.ranks[idx]), { name,
            minNetworkSalesAmount,
            reward,
            salary });
        yield s.save();
        res.json({ message: "Rank updated", ranks: s.ranks });
    }
    catch (err) {
        next(err);
    }
});
exports.updateRank = updateRank;
const replaceAllRanks = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const s = yield model_1.Settings.findOne();
        if (!s)
            return res.status(404).json({ message: "Settings not found" });
        // First 2 ranks are locked — always preserved from DB, never replaced by payload
        const lockedRanks = s.ranks.slice(0, 2);
        const editableRanks = ((_a = req.body.ranks) !== null && _a !== void 0 ? _a : []).slice(2);
        s.ranks = [...lockedRanks, ...editableRanks];
        yield s.save();
        res.json({ message: "Ranks replaced successfully", ranks: s.ranks });
    }
    catch (err) {
        next(err);
    }
});
exports.replaceAllRanks = replaceAllRanks;
const deleteRank = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const s = yield model_1.Settings.findOne();
        if (!s)
            return res.status(404).json({ message: "Settings not found" });
        // First 2 ranks are locked and cannot be deleted
        const rankIdx = s.ranks.findIndex((r) => r._id.toString() === req.params.id);
        if (rankIdx === -1)
            return res.status(404).json({ message: "Rank not found" });
        if (rankIdx < 2)
            return res.status(403).json({ message: "This rank is locked and cannot be deleted" });
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
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    try {
        const user = yield model_2.User.findById(req.user._id)
            .select("currentRank currentRankAchievedAt earnedRanks directSalesCount teamSalesCount")
            .lean();
        const s = yield getSettings();
        // Keep original Settings order — order defines rank progression
        const allRanks = [...((_a = s.ranks) !== null && _a !== void 0 ? _a : [])];
        const currentRankName = (_b = user === null || user === void 0 ? void 0 : user.currentRank) !== null && _b !== void 0 ? _b : null;
        // currentRank is always looked up from Settings.ranks — no hardcoded system ranks
        const currentRank = (_c = allRanks.find((r) => r.name === currentRankName)) !== null && _c !== void 0 ? _c : null;
        // Next rank = the rank that comes immediately after currentRank in Settings order.
        // Special case for Rank 2 (index 1): if user is already at Rank 3+ (index >= 2),
        // next rank is the one after currentRank, skipping Rank 2 if already bypassed.
        const currentIndex = currentRank
            ? allRanks.findIndex((r) => r.name === currentRankName)
            : -1;
        let nextRank = null;
        if (currentIndex === -1) {
            // No rank yet — next is Rank 1
            nextRank = (_d = allRanks[0]) !== null && _d !== void 0 ? _d : null;
        }
        else if (currentIndex === 0) {
            // At Rank 1 — next is Rank 2
            nextRank = (_e = allRanks[1]) !== null && _e !== void 0 ? _e : null;
        }
        else if (currentIndex >= 2) {
            // At Rank 3+ — next is simply the rank after current in Settings order
            nextRank = (_f = allRanks[currentIndex + 1]) !== null && _f !== void 0 ? _f : null;
        }
        else {
            // At Rank 2 — next is Rank 3
            nextRank = (_g = allRanks[2]) !== null && _g !== void 0 ? _g : null;
        }
        const directSalesCount = (_h = user === null || user === void 0 ? void 0 : user.directSalesCount) !== null && _h !== void 0 ? _h : 0;
        const teamSalesCount = (_j = user === null || user === void 0 ? void 0 : user.teamSalesCount) !== null && _j !== void 0 ? _j : 0;
        res.json({ currentRank, nextRank, allRanks, directSalesCount, teamSalesCount });
    }
    catch (err) {
        next(err);
    }
});
exports.getMyRank = getMyRank;
// ── Core: get total approved sales amount for all network members of a user ───
function getTotalApprovedSalesByGeneration(userId, generation) {
    return __awaiter(this, void 0, void 0, function* () {
        const uid = new mongoose_1.default.Types.ObjectId(userId.toString());
        // Find users whose ancestor at exactly this generation level is the given user
        const networkUsers = yield model_2.User.find({
            generationAncestors: {
                $elemMatch: { userId: uid, level: generation },
            },
        })
            .select("_id")
            .lean();
        if (!networkUsers.length)
            return 0;
        const count = yield model_3.Purchase.countDocuments({
            userId: { $in: networkUsers.map((u) => u._id) },
            status: "approved",
        });
        return count;
    });
}
// ── Recalculate and update user rank ─────────────────────────────────────────
// M-09 fix: accept pre-loaded ranks to avoid repeated Settings.findOne() per ancestor
// C-04 fix: accept pre-loaded ranks to avoid repeated Settings.findOne() per ancestor
const recalcUserRank = (userId, preloadedRanks) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    try {
        const user = yield model_2.User.findById(userId).select("currentRank currentRankAchievedAt earnedRanks personalPurchaseCount");
        if (!user)
            return;
        // C-04 fix: reuse passed ranks, only query if not provided
        let ranks;
        if (preloadedRanks) {
            ranks = preloadedRanks;
        }
        else {
            const s = yield model_1.Settings.findOne();
            ranks = ((_a = s === null || s === void 0 ? void 0 : s.ranks) !== null && _a !== void 0 ? _a : []);
        }
        if (!ranks.length)
            return;
        let newRank = null;
        let currentEarnedRanks = user.earnedRanks || [];
        const personalPurchaseCount = (_b = user.personalPurchaseCount) !== null && _b !== void 0 ? _b : 0;
        /**
         * Rank promotion rules:
         *
         * Index 0 (Rank 1) — assigned at registration; recalc treats it as always earned.
         *
         * Index 1 (Rank 2) — only condition is minPersonalPurchaseQtyToAchieve (one-time
         *   lifetime personal purchase count). Network sales are NOT checked.
         *   Sequential gate: must hold Rank 1 (already guaranteed by registration logic).
         *   IMPORTANT: if user is already at Rank 3+, Rank 2 is skipped silently — we
         *   never downgrade.
         *
         * Index 2+ (Rank 3 and above) — checked only for network sales threshold.
         *   Sequential gate applies ONLY among ranks at index 2+ (i.e. must hold the
         *   previous rank at index >= 2). Rank 2 NOT required — a user can jump from
         *   Rank 1 directly to Rank 3 if network sales conditions are met.
         */
        for (let i = 0; i < ranks.length; i++) {
            const rank = ranks[i];
            // ── Already earned this rank — mark and continue ──────────────────────
            if (currentEarnedRanks.includes(rank.name)) {
                newRank = rank;
                continue;
            }
            // ── Rank 1 (index 0): always already earned (assigned at registration) ─
            // recalcUserRank is never responsible for awarding Rank 1.
            if (i === 0) {
                // Rank 1 should already be in earnedRanks (set at registration).
                // If somehow it's missing, add it defensively but don't issue reward.
                currentEarnedRanks.push(rank.name);
                newRank = rank;
                continue;
            }
            // ── Rank 2 (index 1): personal purchase only ──────────────────────────
            if (i === 1) {
                const minPersonalQty = (_c = rank.minPersonalPurchaseQtyToAchieve) !== null && _c !== void 0 ? _c : 0;
                if (minPersonalQty > 0 && personalPurchaseCount < minPersonalQty) {
                    // Rank 2 condition not met — but do NOT break; Rank 3+ can still be checked
                    continue;
                }
                // Condition met — award Rank 2 only if user doesn't already hold a higher rank
                const currentRankIndex = ranks.findIndex((r) => r.name === user.currentRank);
                if (currentRankIndex > 1) {
                    // Already at Rank 3+ — skip Rank 2 silently, add to earnedRanks for bookkeeping
                    currentEarnedRanks.push(rank.name);
                    continue;
                }
                newRank = rank;
                currentEarnedRanks.push(rank.name);
                continue;
            }
            // ── Rank 3+ (index >= 2): network sales, sequential among index 2+ ────
            // Sequential gate: the previous rank at index >= 2 must have been earned.
            // Rank 2 (index 1) is deliberately excluded from this gate.
            if (i >= 3) {
                // Must hold the rank at index i-1 (which is also index >= 2)
                if (!currentEarnedRanks.includes(ranks[i - 1].name)) {
                    break;
                }
            }
            else {
                // i === 2 (Rank 3): must hold Rank 1 (index 0). Rank 2 NOT required.
                if (!currentEarnedRanks.includes(ranks[0].name)) {
                    break;
                }
            }
            // Check personal purchase requirement if configured on this rank
            const minPersonalQty = (_d = rank.minPersonalPurchaseQtyToAchieve) !== null && _d !== void 0 ? _d : 0;
            if (minPersonalQty > 0 && personalPurchaseCount < minPersonalQty) {
                break;
            }
            // Check network sales threshold
            const threshold = (_e = rank.minNetworkSalesAmount) !== null && _e !== void 0 ? _e : 0;
            if (threshold > 0) {
                // Generation mapping: Rank 3 (index 2) → gen 1, Rank 4 (index 3) → gen 2, etc.
                const generation = i - 1;
                const totalSales = yield getTotalApprovedSalesByGeneration(userId, generation);
                if (totalSales >= threshold) {
                    newRank = rank;
                    currentEarnedRanks.push(rank.name);
                }
                else {
                    break;
                }
            }
        }
        const newRankName = (_f = newRank === null || newRank === void 0 ? void 0 : newRank.name) !== null && _f !== void 0 ? _f : null;
        if (newRankName && newRankName !== user.currentRank) {
            // H-10 fix: atomic update — only update if currentRank hasn't changed concurrently
            const updated = yield model_2.User.findOneAndUpdate({ _id: userId, currentRank: user.currentRank }, {
                $set: {
                    currentRank: newRankName,
                    currentRankAchievedAt: new Date(),
                    earnedRanks: currentEarnedRanks,
                },
            }, { new: true });
            // If updated is null, another concurrent call already updated the rank — skip reward
            if (updated) {
                yield issueRankReward(userId, newRank);
            }
        }
    }
    catch (err) {
        console.error("recalcUserRank error:", err);
    }
});
exports.recalcUserRank = recalcUserRank;
function issueRankReward(userId, rank) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!(rank === null || rank === void 0 ? void 0 : rank.reward))
            return;
        // Fix F-08: Atomic check — only issue reward if not already issued for this rank
        // Uses TransactionLog as the source of truth to prevent double-issuance
        const alreadyIssued = yield model_4.TransactionLog.findOne({
            userId,
            type: "reward",
            note: { $regex: `"${rank.name}"` },
        }).lean();
        if (alreadyIssued)
            return;
        // reward is a physical/named item — no monetary value, so wallet is not touched
        const note = `Rank reward — "${rank.name}" achieved: ${rank.reward}`;
        yield model_4.TransactionLog.create({
            userId,
            type: "reward",
            amount: 0,
            balanceAfter: 0,
            note,
        });
        try {
            yield model_5.CompanyLedger.create({
                date: new Date(),
                type: "reward_paid",
                amount: 0,
                userId,
                note,
            });
        }
        catch (ledgerErr) {
            console.error(`[LEDGER ERROR] reward_paid for userId=${userId}:`, ledgerErr);
        }
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
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    const s = yield model_1.Settings.findOne();
    const ranks = ((_a = s === null || s === void 0 ? void 0 : s.ranks) !== null && _a !== void 0 ? _a : []).filter((r) => { var _a; return ((_a = r.salary) === null || _a === void 0 ? void 0 : _a.amount) > 0; });
    if (!ranks.length)
        return 0;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1–12
    // Month boundaries for current-month direct-sales check
    const monthStart = new Date(currentYear, currentMonth - 1, 1);
    const monthEnd = new Date(currentYear, currentMonth, 1);
    let count = 0;
    const users = yield model_2.User.find({
        currentRank: { $in: ranks.map((r) => r.name) },
    }).select("_id currentRank currentRankAchievedAt personalPurchaseCount");
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
        const maxDuration = (_c = sal.salaryDurationMonths) !== null && _c !== void 0 ? _c : 3;
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
        // ── Condition 1: current-month direct sales ──────────────────────────────
        // Count approved purchases this month where the buyer's gen-1 ancestor is this user.
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
        if (monthlySalesCount < ((_f = sal.minMonthlySalesQty) !== null && _f !== void 0 ? _f : 0))
            continue;
        // ── Condition 2: cumulative personal purchase count ──────────────────────
        // The user must have accumulated at least minTotalPersonalPurchaseQtyForSalary
        // total (all-time) approved personal purchases to receive salary this month.
        const minTotalPersonalQty = (_g = sal.minTotalPersonalPurchaseQtyForSalary) !== null && _g !== void 0 ? _g : 0;
        if (minTotalPersonalQty > 0) {
            const userPersonalCount = (_h = user.personalPurchaseCount) !== null && _h !== void 0 ? _h : 0;
            if (userPersonalCount < minTotalPersonalQty)
                continue;
        }
        // Fix F-05: atomic $inc — prevents race condition if cron runs twice concurrently
        const updatedWallet = yield model_4.Wallet.findOneAndUpdate({ userId: user._id }, { $inc: { salaryBalanceFromRanks: sal.amount, totalBalance: sal.amount } }, { new: true, upsert: true });
        yield model_4.TransactionLog.create({
            userId: user._id,
            type: "salary",
            amount: sal.amount,
            balanceAfter: updatedWallet.salaryBalanceFromRanks,
            note: `Monthly salary — Rank: ${rank.name}, Month: ${currentYear}-${String(currentMonth).padStart(2, "0")}, ৳${sal.amount.toLocaleString()} (payment ${paidCount + 1}/${(_j = sal.salaryDurationMonths) !== null && _j !== void 0 ? _j : 3})`,
        });
        try {
            yield model_5.CompanyLedger.create({
                date: new Date(),
                type: "salary_paid",
                amount: sal.amount,
                userId: user._id,
                note: `Monthly salary — Rank: ${rank.name}, Month: ${currentYear}-${String(currentMonth).padStart(2, "0")}, ৳${sal.amount.toLocaleString()} (payment ${paidCount + 1}/${(_k = sal.salaryDurationMonths) !== null && _k !== void 0 ? _k : 3})`,
            });
        }
        catch (ledgerErr) {
            console.error(`[LEDGER ERROR] salary_paid for userId=${user._id}:`, ledgerErr);
        }
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
