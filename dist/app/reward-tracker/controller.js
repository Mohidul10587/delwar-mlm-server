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
exports.updateRewardCycleStatus = exports.getPendingRewards = exports.getTrackerByPurchase = exports.getMyRewardTrackers = void 0;
const service_1 = require("./service");
const model_1 = require("./model");
/**
 * GET /reward-tracker/my
 * Login করা user-এর সমস্ত reward tracker দেখুন।
 */
const getMyRewardTrackers = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const trackers = yield (0, service_1.getRewardTrackersByUser)(req.user._id.toString());
        res.json({ trackers });
    }
    catch (err) {
        next(err);
    }
});
exports.getMyRewardTrackers = getMyRewardTrackers;
/**
 * GET /reward-tracker/purchase/:purchaseId
 * একটি purchase-এর reward tracker দেখুন।
 */
const getTrackerByPurchase = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { purchaseId } = req.params;
        const tracker = yield (0, service_1.getRewardTrackerByPurchase)(purchaseId);
        if (!tracker) {
            return res.status(404).json({ message: "Reward tracker not found" });
        }
        // Owner বা Staff check
        const isOwner = tracker.userId.toString() === req.user._id.toString();
        const isStaff = ["superadmin", "admin", "staff"].includes(req.user.role);
        if (!isOwner && !isStaff) {
            return res.status(403).json({ message: "Forbidden" });
        }
        res.json({ tracker });
    }
    catch (err) {
        next(err);
    }
});
exports.getTrackerByPurchase = getTrackerByPurchase;
/**
 * GET /reward-tracker/admin/all
 * Admin — সমস্ত pending reward cycle দেখুন।
 */
const getPendingRewards = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const trackers = yield model_1.RewardTracker.find({
            "cycles.status": "pending",
        })
            .populate("userId", "name username phone")
            .populate("purchaseId", "snapshot quantity createdAt")
            .sort({ updatedAt: -1 })
            .lean();
        // pending cycle-গুলো আলাদা করে flatten করি
        const pendingItems = trackers.flatMap((t) => {
            var _a;
            return ((_a = t.cycles) !== null && _a !== void 0 ? _a : [])
                .filter((c) => c.status === "pending")
                .map((c) => ({
                trackerId: t._id,
                purchaseId: t.purchaseId,
                userId: t.userId,
                cycleNumber: c.cycleNumber,
                cycleType: c.cycleType,
                completedAt: c.completedAt,
                rewardAmount: c.rewardAmount,
                status: c.status,
            }));
        });
        res.json({ pendingItems, total: pendingItems.length });
    }
    catch (err) {
        next(err);
    }
});
exports.getPendingRewards = getPendingRewards;
/**
 * PATCH /reward-tracker/:purchaseId/cycles/:cycleNumber/status
 * Admin — একটি Reward Cycle-এর status পরিবর্তন করুন।
 * Body: { status: "approved" | "paid" | "cancelled", note?: string }
 */
const updateRewardCycleStatus = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { purchaseId, cycleNumber } = req.params;
        const { status, note } = req.body;
        if (!["approved", "paid", "cancelled"].includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }
        const tracker = yield model_1.RewardTracker.findOne({ purchaseId });
        if (!tracker) {
            return res.status(404).json({ message: "Reward tracker not found" });
        }
        const cycleNo = parseInt(cycleNumber, 10);
        const cycle = tracker.cycles.find((c) => c.cycleNumber === cycleNo);
        if (!cycle) {
            return res
                .status(404)
                .json({ message: `Cycle #${cycleNo} not found` });
        }
        cycle.status = status;
        if (status === "paid")
            cycle.paidAt = new Date();
        if (note)
            cycle.note = note;
        tracker.markModified("cycles");
        yield tracker.save();
        res.json({ message: `Cycle #${cycleNo} status updated to ${status}`, tracker });
    }
    catch (err) {
        next(err);
    }
});
exports.updateRewardCycleStatus = updateRewardCycleStatus;
