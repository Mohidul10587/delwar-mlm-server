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
exports.getAchievers = void 0;
const model_1 = require("../settings/model");
const model_2 = require("../user/model");
const VISIBLE_LIMIT = 8;
const getAchievers = (_req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        // Single Settings read
        const settings = yield model_1.Settings.findOne().select("ranks").lean();
        const ranks = (_a = settings === null || settings === void 0 ? void 0 : settings.ranks) !== null && _a !== void 0 ? _a : [];
        if (!ranks.length) {
            return res.json([]);
        }
        // Single optimized User query — only needed fields, only users with a currentRank
        const rankNames = ranks.map((r) => r.name);
        const users = yield model_2.User.find({
            currentRank: { $in: rankNames },
        })
            .select("_id name username image currentRank currentRankAchievedAt")
            .lean();
        // Group users by rank in memory (avoids N+1 queries)
        const byRank = new Map();
        for (const user of users) {
            const rankName = user.currentRank;
            if (!byRank.has(rankName)) {
                byRank.set(rankName, []);
            }
            byRank.get(rankName).push({
                id: user._id.toString(),
                name: user.name,
                username: user.username,
                image: (_b = user.image) !== null && _b !== void 0 ? _b : null,
                achievedAt: (_c = user.currentRankAchievedAt) !== null && _c !== void 0 ? _c : null,
            });
        }
        // Sort each group: ascending by achievedAt (nulls last)
        for (const members of byRank.values()) {
            members.sort((a, b) => {
                if (!a.achievedAt && !b.achievedAt)
                    return 0;
                if (!a.achievedAt)
                    return 1;
                if (!b.achievedAt)
                    return -1;
                return a.achievedAt.getTime() - b.achievedAt.getTime();
            });
        }
        // Build response following Settings.ranks order, hide empty ranks
        const result = [];
        for (const rank of ranks) {
            const members = (_d = byRank.get(rank.name)) !== null && _d !== void 0 ? _d : [];
            if (!members.length)
                continue; // hide empty rank sections
            const visibleMembers = members.slice(0, VISIBLE_LIMIT);
            const totalMembers = members.length;
            const remaining = totalMembers - visibleMembers.length;
            result.push({
                rank: rank.name,
                totalMembers,
                visibleMembers,
                remaining,
            });
        }
        res.json(result);
    }
    catch (err) {
        next(err);
    }
});
exports.getAchievers = getAchievers;
