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
exports.getGenerations = exports.getReferrals = exports.getUpline = exports.getDownline = void 0;
const model_1 = require("../user/model");
const buildTreeFromFlat = (nodes, parentId) => nodes
    .filter(n => { var _a, _b, _c; return ((_c = (_b = (_a = n.generationAncestors) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.userId) === null || _c === void 0 ? void 0 : _c.toString()) === parentId; })
    .map(n => ({
    _id: n._id.toString(),
    username: n.username,
    name: n.name,
    children: buildTreeFromFlat(nodes, n._id.toString()),
}));
const getDownline = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const all = yield model_1.User.find({ "generationAncestors.userId": req.user._id })
            .select("_id username name generationAncestors")
            .lean();
        res.json({ tree: buildTreeFromFlat(all, req.user._id.toString()) });
    }
    catch (err) {
        next(err);
    }
});
exports.getDownline = getDownline;
const getUpline = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const me = yield model_1.User.findById(req.user._id).select("generationAncestors").lean();
        const level1 = (_a = me === null || me === void 0 ? void 0 : me.generationAncestors) === null || _a === void 0 ? void 0 : _a[0];
        if (!level1)
            return res.json({ upline: null });
        const parent = yield model_1.User.findById(level1.userId).select("_id username name").lean();
        if (!parent)
            return res.json({ upline: null });
        res.json({ upline: { _id: parent._id.toString(), username: parent.username, name: parent.name } });
    }
    catch (err) {
        next(err);
    }
});
exports.getUpline = getUpline;
const getReferrals = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const referrals = yield model_1.User.find({ "generationAncestors.0.userId": req.user._id })
            .select("_id username name phone createdAt")
            .lean();
        res.json({ referrals });
    }
    catch (err) {
        next(err);
    }
});
exports.getReferrals = getReferrals;
// GET /network/generations
// Returns all downline members grouped by generation level
const getGenerations = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const userId = req.user._id.toString();
        const all = yield model_1.User.find({ "generationAncestors.userId": req.user._id })
            .select("_id username name phone createdAt generationAncestors directSalesCount personalSharesCount currentRank")
            .lean();
        // Group each user by the level they appear at under our user
        const genMap = {};
        for (const u of all) {
            const entry = (_a = u.generationAncestors) === null || _a === void 0 ? void 0 : _a.find((a) => { var _a; return ((_a = a.userId) === null || _a === void 0 ? void 0 : _a.toString()) === userId; });
            if (!entry)
                continue;
            const level = entry.level;
            if (!genMap[level])
                genMap[level] = [];
            genMap[level].push({
                _id: u._id,
                username: u.username,
                name: u.name,
                phone: u.phone,
                createdAt: u.createdAt,
                directSalesCount: (_b = u.directSalesCount) !== null && _b !== void 0 ? _b : 0,
                personalSharesCount: (_c = u.personalSharesCount) !== null && _c !== void 0 ? _c : 0,
                currentRank: (_d = u.currentRank) !== null && _d !== void 0 ? _d : null,
            });
        }
        const maxGen = Object.keys(genMap).length > 0
            ? Math.max(...Object.keys(genMap).map(Number))
            : 0;
        const generations = Array.from({ length: maxGen }, (_, i) => {
            var _a, _b;
            return ({
                generation: i + 1,
                members: (_a = genMap[i + 1]) !== null && _a !== void 0 ? _a : [],
                count: ((_b = genMap[i + 1]) !== null && _b !== void 0 ? _b : []).length,
            });
        });
        res.json({ generations, totalMembers: all.length });
    }
    catch (err) {
        next(err);
    }
});
exports.getGenerations = getGenerations;
