import { Router } from "express";
import { getDownline, getUpline, getReferrals, getGenerations } from "./controller";
import { verifyUser } from "../../middleware/auth";

const router = Router();

router.get("/downline",    verifyUser, getDownline);
router.get("/upline",      verifyUser, getUpline);
router.get("/referrals",   verifyUser, getReferrals);
router.get("/generations", verifyUser, getGenerations);

export default router;
