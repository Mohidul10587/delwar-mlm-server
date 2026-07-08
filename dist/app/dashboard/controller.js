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
exports.getUserDashboard = void 0;
const model_1 = require("../wallet/model");
const model_2 = require("../purchase/model");
const model_3 = require("../settings/model");
const model_4 = require("../user/model");
const model_5 = require("../project/model");
const model_6 = require("../event/model");
// M-08 fix: O(n) tree build using pre-indexed parent→children map
const buildTree = (nodes, parentId) => {
    var _a, _b, _c;
    const childMap = new Map();
    for (const n of nodes) {
        const pid = (_c = (_b = (_a = n.generationAncestors) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.userId) === null || _c === void 0 ? void 0 : _c.toString();
        if (!pid)
            continue;
        if (!childMap.has(pid))
            childMap.set(pid, []);
        childMap.get(pid).push(n);
    }
    const buildNode = (pid) => {
        var _a;
        return ((_a = childMap.get(pid)) !== null && _a !== void 0 ? _a : []).map((n) => ({
            _id: n._id.toString(),
            username: n.username,
            name: n.name,
            children: buildNode(n._id.toString()),
        }));
    };
    return buildNode(parentId);
};
// GET /dashboard/user
const getUserDashboard = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    try {
        const userId = req.user._id;
        const [wallet, purchases, user, downlineNodes, settings, shares, events] = yield Promise.all([
            model_1.Wallet.findOne({ userId }).lean(),
            model_2.Purchase.find({ userId }).populate("projectId", "title cashPrice installment image").sort({ createdAt: -1 }).lean(),
            model_4.User.findById(userId).select("directSalesCount teamSalesCount currentRank").lean(),
            // H-06 fix: limit downline fetch to prevent memory issues on large networks
            model_4.User.find({ "generationAncestors.userId": userId })
                .select("_id username name generationAncestors")
                .limit(500)
                .lean(),
            model_3.Settings.findOne().lean(),
            model_5.Project.find({ isActive: true }).lean(),
            model_6.Event.find({ isActive: true }).sort({ createdAt: -1 }).limit(3).lean(),
        ]);
        const allRanks = [...((_a = settings === null || settings === void 0 ? void 0 : settings.ranks) !== null && _a !== void 0 ? _a : [])].sort((a, b) => { var _a, _b; return ((_a = a.minNetworkSalesAmount) !== null && _a !== void 0 ? _a : 0) - ((_b = b.minNetworkSalesAmount) !== null && _b !== void 0 ? _b : 0); });
        const directSalesCount = (_b = user === null || user === void 0 ? void 0 : user.directSalesCount) !== null && _b !== void 0 ? _b : 0;
        const teamSalesCount = (_c = user === null || user === void 0 ? void 0 : user.teamSalesCount) !== null && _c !== void 0 ? _c : 0;
        const currentRankName = (_d = user === null || user === void 0 ? void 0 : user.currentRank) !== null && _d !== void 0 ? _d : null;
        const currentRank = (_e = allRanks.find((r) => r.name === currentRankName)) !== null && _e !== void 0 ? _e : null;
        const currentRequired = (_f = currentRank === null || currentRank === void 0 ? void 0 : currentRank.minNetworkSalesAmount) !== null && _f !== void 0 ? _f : 0;
        const nextRank = (_g = allRanks.find((r) => { var _a; return ((_a = r.minNetworkSalesAmount) !== null && _a !== void 0 ? _a : 0) > currentRequired; })) !== null && _g !== void 0 ? _g : null;
        res.json({
            wallet,
            purchases,
            shares,
            events,
            investmentConfig: (_h = settings === null || settings === void 0 ? void 0 : settings.investmentConfig) !== null && _h !== void 0 ? _h : null,
            network: { tree: buildTree(downlineNodes, userId.toString()) },
            rank: { currentRank, nextRank, directSalesCount, teamSalesCount },
        });
    }
    catch (err) {
        next(err);
    }
});
exports.getUserDashboard = getUserDashboard;
