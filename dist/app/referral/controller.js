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
exports.getReferralTree = exports.getAllUsers = exports.getStats = void 0;
const model_1 = require("../user/model");
const model_2 = require("../transaction/model");
const service_1 = require("../referralChain/service");
const MAX_LEVELS = 6; // Fixed max levels for referral chain
const getStats = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const levels = {};
        const commissionReasons = [];
        let totalReferrals = 0;
        for (let i = 1; i <= MAX_LEVELS; i++) {
            const referrals = yield (0, service_1.getReferralsByLevel)(userId, i);
            const count = referrals.length;
            levels[`level${i}`] = count;
            totalReferrals += count;
            commissionReasons.push(`Level ${i} Commission`);
        }
        const commissionTransactions = yield model_2.Transaction.find({
            userId,
            description: { $in: commissionReasons },
        });
        const totalEarnings = commissionTransactions.reduce((sum, t) => sum + t.recentAmount, 0);
        res.status(200).json(Object.assign(Object.assign({ totalReferrals }, levels), { totalEarnings }));
    }
    catch (error) {
        next(error);
    }
});
exports.getStats = getStats;
const getAllUsers = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield model_1.User.find({})
            .select("userId name username")
            .sort({ createdAt: -1 });
        res.status(200).json(users);
    }
    catch (error) {
        next(error);
    }
});
exports.getAllUsers = getAllUsers;
const getReferralTree = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const user = yield model_1.User.findById(userId).select("userId name username");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const tree = {};
        for (let i = 1; i <= MAX_LEVELS; i++) {
            const referralIds = yield (0, service_1.getReferralsByLevel)(userId, i);
            const users = yield model_1.User.find({ _id: { $in: referralIds } }).select("userId name username");
            tree[`level${i}`] = users;
        }
        res.status(200).json(Object.assign({ user }, tree));
    }
    catch (error) {
        next(error);
    }
});
exports.getReferralTree = getReferralTree;
