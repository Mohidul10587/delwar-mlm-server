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
exports.getReferralsByLevel = exports.getDirectReferrals = exports.getParentReferrers = exports.createReferralChain = void 0;
const model_1 = require("../upline/model");
const createReferralChain = (newUserId, referrerId) => __awaiter(void 0, void 0, void 0, function* () {
    const referrerChain = yield model_1.ReferralChain.findOne({ userId: referrerId });
    const chain = {
        level1: referrerId,
    };
    if (referrerChain) {
        if (referrerChain.level1)
            chain.level2 = referrerChain.level1;
        if (referrerChain.level2)
            chain.level3 = referrerChain.level2;
        if (referrerChain.level3)
            chain.level4 = referrerChain.level3;
        if (referrerChain.level4)
            chain.level5 = referrerChain.level4;
        if (referrerChain.level5)
            chain.level6 = referrerChain.level5;
    }
    yield model_1.ReferralChain.create(Object.assign({ userId: newUserId }, chain));
});
exports.createReferralChain = createReferralChain;
const getParentReferrers = (userId_1, ...args_1) => __awaiter(void 0, [userId_1, ...args_1], void 0, function* (userId, maxLevels = 6) {
    const chain = yield model_1.ReferralChain.findOne({ userId });
    if (!chain)
        return [];
    const parents = [];
    for (let i = 1; i <= Math.min(maxLevels, 6); i++) {
        const levelKey = `level${i}`;
        const parentId = chain[levelKey];
        if (parentId)
            parents.push(parentId);
    }
    return parents;
});
exports.getParentReferrers = getParentReferrers;
const getDirectReferrals = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const referrals = yield model_1.ReferralChain.find({ level1: userId }).select("userId");
    return referrals.map((r) => r.userId);
});
exports.getDirectReferrals = getDirectReferrals;
const getReferralsByLevel = (userId, level) => __awaiter(void 0, void 0, void 0, function* () {
    if (level < 1 || level > 6)
        return [];
    const levelKey = `level${level}`;
    const referrals = yield model_1.ReferralChain.find({ [levelKey]: userId }).select("userId");
    return referrals.map((r) => r.userId);
});
exports.getReferralsByLevel = getReferralsByLevel;
