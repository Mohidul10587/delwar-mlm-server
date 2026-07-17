import { Router } from "express";
import { createWithdrawal, getWithdrawals, getMyWithdrawals, updateWithdrawalStatus } from "./controller";
import { verifyUser, verifyAdmin, verifyBranchManager } from "../../middleware/auth";

const router = Router();

router.post("/", verifyUser, createWithdrawal);
router.get("/my", verifyUser, getMyWithdrawals);
// Both superadmin/admin AND branch_manager can list withdrawals (controller filters by branch for manager)
router.get("/", verifyBranchManager, getWithdrawals);
router.patch("/:id/status", verifyAdmin, updateWithdrawalStatus);

export default router;
