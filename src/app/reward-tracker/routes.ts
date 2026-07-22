import { Router } from "express";
import {
  getMyRewardTrackers,
  getTrackerByPurchase,
  getPendingRewards,
  updateRewardCycleStatus,
} from "./controller";
import { verifyUser, verifyStaff } from "../../middleware/auth";

const router = Router();

router.get("/my", verifyUser, getMyRewardTrackers);
router.get("/purchase/:purchaseId", verifyUser, getTrackerByPurchase);
router.get("/admin/all", verifyStaff, getPendingRewards);
router.patch(
  "/:purchaseId/cycles/:cycleNumber/status",
  verifyStaff,
  updateRewardCycleStatus
);

export default router;
