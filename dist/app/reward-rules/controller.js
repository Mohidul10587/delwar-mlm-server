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
exports.deleteRewardRule = exports.updateRewardRule = exports.addRewardRule = exports.getPublicRewardRules = exports.getRewardRules = void 0;
const model_1 = require("../settings/model");
/**
 * Atomic upsert helper — ensures a Settings document always exists.
 */
const getOrCreateSettings = () => __awaiter(void 0, void 0, void 0, function* () {
    return yield model_1.Settings.findOneAndUpdate({}, { $setOnInsert: {} }, { upsert: true, new: true, setDefaultsOnInsert: true });
});
/**
 * GET /reward-rules
 * Returns all reward rules.
 */
const getRewardRules = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const settings = yield getOrCreateSettings();
        const rules = (_a = settings.installmentRewardRules) !== null && _a !== void 0 ? _a : [];
        res.json({ rules });
    }
    catch (err) {
        next(err);
    }
});
exports.getRewardRules = getRewardRules;
/**
 * GET /reward-rules/public
 * Returns all rules sorted by targetAmount — safe for frontend display (no auth required).
 */
const getPublicRewardRules = (_req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const settings = yield getOrCreateSettings();
        const rules = [...((_a = settings.installmentRewardRules) !== null && _a !== void 0 ? _a : [])].sort((a, b) => a.targetAmount - b.targetAmount);
        res.json({ rules });
    }
    catch (err) {
        next(err);
    }
});
exports.getPublicRewardRules = getPublicRewardRules;
/**
 * POST /reward-rules
 * Add a new reward rule.
 * Body: { targetAmount, oneTimeReward, installmentCompletionReward }
 */
const addRewardRule = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { targetAmount, oneTimeReward, installmentCompletionReward } = req.body;
        if (typeof targetAmount !== "number" || targetAmount <= 0 ||
            typeof oneTimeReward !== "number" || oneTimeReward < 0 ||
            typeof installmentCompletionReward !== "number" || installmentCompletionReward < 0) {
            return res.status(400).json({
                message: "targetAmount (>0), oneTimeReward (>=0), and installmentCompletionReward (>=0) are required numbers",
            });
        }
        const settings = yield getOrCreateSettings();
        // Prevent duplicate targetAmount
        const existing = ((_a = settings.installmentRewardRules) !== null && _a !== void 0 ? _a : []).find((r) => r.targetAmount === targetAmount);
        if (existing) {
            return res.status(409).json({
                message: `A reward rule for targetAmount ৳${targetAmount.toLocaleString()} already exists`,
            });
        }
        settings.installmentRewardRules = [
            ...((_b = settings.installmentRewardRules) !== null && _b !== void 0 ? _b : []),
            { targetAmount, oneTimeReward, installmentCompletionReward },
        ];
        yield settings.save();
        res.status(201).json({ message: "Reward rule added", rules: settings.installmentRewardRules });
    }
    catch (err) {
        next(err);
    }
});
exports.addRewardRule = addRewardRule;
/**
 * PUT /reward-rules/:targetAmount
 * Update an existing reward rule identified by its targetAmount.
 * Body: { oneTimeReward?, installmentCompletionReward?, newTargetAmount? }
 */
const updateRewardRule = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const targetAmount = Number(req.params.targetAmount);
        if (isNaN(targetAmount) || targetAmount <= 0) {
            return res.status(400).json({ message: "Invalid targetAmount in URL" });
        }
        const settings = yield getOrCreateSettings();
        const rules = (_a = settings.installmentRewardRules) !== null && _a !== void 0 ? _a : [];
        const ruleIndex = rules.findIndex((r) => r.targetAmount === targetAmount);
        if (ruleIndex === -1) {
            return res.status(404).json({
                message: `No reward rule found for targetAmount ৳${targetAmount.toLocaleString()}`,
            });
        }
        const { oneTimeReward, installmentCompletionReward, newTargetAmount } = req.body;
        // If newTargetAmount is provided, check it doesn't conflict
        if (typeof newTargetAmount === "number" && newTargetAmount !== targetAmount) {
            const conflict = rules.find((r, i) => r.targetAmount === newTargetAmount && i !== ruleIndex);
            if (conflict) {
                return res.status(409).json({
                    message: `A rule with targetAmount ৳${newTargetAmount.toLocaleString()} already exists`,
                });
            }
        }
        // Apply updates
        const rule = rules[ruleIndex];
        if (typeof newTargetAmount === "number" && newTargetAmount > 0)
            rule.targetAmount = newTargetAmount;
        if (typeof oneTimeReward === "number" && oneTimeReward >= 0)
            rule.oneTimeReward = oneTimeReward;
        if (typeof installmentCompletionReward === "number" && installmentCompletionReward >= 0)
            rule.installmentCompletionReward = installmentCompletionReward;
        settings.installmentRewardRules = rules;
        settings.markModified("installmentRewardRules");
        yield settings.save();
        res.json({ message: "Reward rule updated", rules: settings.installmentRewardRules });
    }
    catch (err) {
        next(err);
    }
});
exports.updateRewardRule = updateRewardRule;
/**
 * DELETE /reward-rules/:targetAmount
 * Remove a reward rule by its targetAmount.
 */
const deleteRewardRule = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const targetAmount = Number(req.params.targetAmount);
        if (isNaN(targetAmount) || targetAmount <= 0) {
            return res.status(400).json({ message: "Invalid targetAmount in URL" });
        }
        const settings = yield getOrCreateSettings();
        const rules = (_a = settings.installmentRewardRules) !== null && _a !== void 0 ? _a : [];
        const initialLength = rules.length;
        settings.installmentRewardRules = rules.filter((r) => r.targetAmount !== targetAmount);
        if (settings.installmentRewardRules.length === initialLength) {
            return res.status(404).json({
                message: `No reward rule found for targetAmount ৳${targetAmount.toLocaleString()}`,
            });
        }
        settings.markModified("installmentRewardRules");
        yield settings.save();
        res.json({ message: "Reward rule deleted", rules: settings.installmentRewardRules });
    }
    catch (err) {
        next(err);
    }
});
exports.deleteRewardRule = deleteRewardRule;
