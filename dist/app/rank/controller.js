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
exports.recalcUserRank = exports.getMyRank = exports.deleteRank = exports.updateRank = exports.createRank = exports.getRanks = void 0;
const model_1 = require("../settings/model");
const model_2 = require("../user/model");
// ── helpers ──────────────────────────────────────────────────────────────────
const getSettings = () => __awaiter(void 0, void 0, void 0, function* () {
    let s = yield model_1.Settings.findOne();
    if (!s)
        s = yield model_1.Settings.create({});
    return s;
});
/** Given sales counts, find the highest rank the user qualifies for */
const resolveRank = (ranks, directSales, teamSales) => {
    var _a, _b;
    const qualified = ranks
        .filter((r) => directSales >= r.minDirectSales && teamSales >= r.minTeamSales)
        .sort((a, b) => b.order - a.order);
    return (_b = (_a = qualified[0]) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : null;
};
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
        const { name, minDirectSales = 0, minTeamSales = 0, order = 0 } = req.body;
        s.ranks.push({ name, minDirectSales, minTeamSales, order });
        yield s.save();
        res.status(201).json({ message: { en: "Rank created", bn: "র্যাংক তৈরি হয়েছে" }, ranks: s.ranks });
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
            return res.status(404).json({ message: { en: "Rank not found", bn: "র্যাংক পাওয়া যায়নি" } });
        Object.assign(rank, req.body);
        yield s.save();
        res.json({ message: { en: "Rank updated", bn: "র্যাংক আপডেট হয়েছে" }, ranks: s.ranks });
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
        res.json({ message: { en: "Rank deleted", bn: "র্যাংক মুছে ফেলা হয়েছে" } });
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
        const user = yield model_2.User.findById(req.user._id).select("directSalesCount teamSalesCount currentRank").lean();
        const s = yield getSettings();
        const allRanks = ((_a = s.ranks) !== null && _a !== void 0 ? _a : []).sort((a, b) => a.order - b.order);
        const directSales = (_b = user === null || user === void 0 ? void 0 : user.directSalesCount) !== null && _b !== void 0 ? _b : 0;
        const teamSales = (_c = user === null || user === void 0 ? void 0 : user.teamSalesCount) !== null && _c !== void 0 ? _c : 0;
        const currentRankName = (_d = user === null || user === void 0 ? void 0 : user.currentRank) !== null && _d !== void 0 ? _d : null;
        const currentRank = (_e = allRanks.find((r) => r.name === currentRankName)) !== null && _e !== void 0 ? _e : null;
        const nextRank = (_f = allRanks.find((r) => { var _a; return r.order > ((_a = currentRank === null || currentRank === void 0 ? void 0 : currentRank.order) !== null && _a !== void 0 ? _a : -1); })) !== null && _f !== void 0 ? _f : null;
        res.json({ directSalesCount: directSales, teamSalesCount: teamSales, currentRank, nextRank, allRanks });
    }
    catch (err) {
        next(err);
    }
});
exports.getMyRank = getMyRank;
// ── called internally after commission distribution ───────────────────────────
const recalcUserRank = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const user = yield model_2.User.findById(userId).select("directSalesCount teamSalesCount");
        if (!user)
            return;
        const s = yield model_1.Settings.findOne();
        const ranks = (_a = s === null || s === void 0 ? void 0 : s.ranks) !== null && _a !== void 0 ? _a : [];
        const newRank = resolveRank(ranks, user.directSalesCount, user.teamSalesCount);
        if (newRank !== user.currentRank) {
            yield model_2.User.findByIdAndUpdate(userId, { currentRank: newRank });
        }
    }
    catch (err) {
        console.error("recalcUserRank error:", err);
    }
});
exports.recalcUserRank = recalcUserRank;
