import { Router } from "express";
import { getDownline, getUpline, getReferrals } from "./controller";
import { verifyUser } from "../../middleware/auth";

const router = Router();

router.get("/downline", verifyUser, getDownline);
router.get("/upline", verifyUser, getUpline);
router.get("/referrals", verifyUser, getReferrals);

export default router;
