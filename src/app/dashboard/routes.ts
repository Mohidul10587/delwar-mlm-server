import { Router } from "express";
import { getUserDashboard } from "./controller";
import { verifyUser } from "../../middleware/auth";

const router = Router();

router.get("/user", verifyUser, getUserDashboard);

export default router;
