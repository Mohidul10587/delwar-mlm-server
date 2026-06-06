import { Router } from "express";
import { createWithdrawal, getWithdrawals, getMyWithdrawals, updateWithdrawalStatus } from "./controller";
import { verifyUser, verifyAdmin } from "../../middleware/auth";

const router = Router();

router.post("/", verifyUser, createWithdrawal);
router.get("/my", verifyUser, getMyWithdrawals);
router.get("/", verifyAdmin, getWithdrawals);
router.patch("/:id/status", verifyAdmin, updateWithdrawalStatus);

export default router;
