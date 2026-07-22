import { Request, Response, NextFunction } from "express";
import {
  getRewardTrackerByPurchase,
  getRewardTrackersByUser,
} from "./service";
import { RewardTracker } from "./model";

/**
 * GET /reward-tracker/my
 * Login করা user-এর সমস্ত reward tracker দেখুন।
 */
export const getMyRewardTrackers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const trackers = await getRewardTrackersByUser(req.user!._id.toString());
    res.json({ trackers });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /reward-tracker/purchase/:purchaseId
 * একটি purchase-এর reward tracker দেখুন।
 */
export const getTrackerByPurchase = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { purchaseId } = req.params;
    const tracker = await getRewardTrackerByPurchase(purchaseId);
    if (!tracker) {
      return res.status(404).json({ message: "Reward tracker not found" });
    }
    // Owner বা Staff check
    const isOwner = tracker.userId.toString() === req.user!._id.toString();
    const isStaff = ["superadmin", "admin", "staff"].includes(req.user!.role);
    if (!isOwner && !isStaff) {
      return res.status(403).json({ message: "Forbidden" });
    }
    res.json({ tracker });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /reward-tracker/admin/all
 * Admin — সমস্ত pending reward cycle দেখুন।
 */
export const getPendingRewards = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const trackers = await RewardTracker.find({
      "cycles.status": "pending",
    })
      .populate("userId", "name username phone")
      .populate("purchaseId", "snapshot quantity createdAt")
      .sort({ updatedAt: -1 })
      .lean();

    // pending cycle-গুলো আলাদা করে flatten করি
    const pendingItems = trackers.flatMap((t) =>
      (t.cycles ?? [])
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
        }))
    );

    res.json({ pendingItems, total: pendingItems.length });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /reward-tracker/:purchaseId/cycles/:cycleNumber/status
 * Admin — একটি Reward Cycle-এর status পরিবর্তন করুন।
 * Body: { status: "approved" | "paid" | "cancelled", note?: string }
 */
export const updateRewardCycleStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { purchaseId, cycleNumber } = req.params;
    const { status, note } = req.body as {
      status: "approved" | "paid" | "cancelled";
      note?: string;
    };

    if (!["approved", "paid", "cancelled"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const tracker = await RewardTracker.findOne({ purchaseId });
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
    if (status === "paid") cycle.paidAt = new Date();
    if (note) cycle.note = note;

    tracker.markModified("cycles");
    await tracker.save();

    res.json({ message: `Cycle #${cycleNo} status updated to ${status}`, tracker });
  } catch (err) {
    next(err);
  }
};
