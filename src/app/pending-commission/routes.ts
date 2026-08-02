import { Router } from "express";
import {
  getPendingBatches,
  getBatchDetails,
  releaseBatch,
  getMyPendingCommissions,
} from "./controller";
import { verifySuperAdmin, verifyUser } from "../../middleware/auth";

const router = Router();

// Super Admin only routes
router.get("/batches", verifySuperAdmin, getPendingBatches);
router.get("/batches/:batchId", verifySuperAdmin, getBatchDetails);
router.post("/batches/:batchId/release", verifySuperAdmin, releaseBatch);

// User route — নিজের pending commission দেখার জন্য
router.get("/my", verifyUser, getMyPendingCommissions);

export default router;
