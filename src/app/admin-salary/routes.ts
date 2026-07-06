import { Router } from "express";
import {
  getSalaryConfigs,
  setSalary,
  releaseSalary,
  getSalaryHistory,
  getMyHistory,
} from "./controller";
import { verifySuperAdmin, verifyAdmin } from "../../middleware/auth";

const router = Router();

// Super admin routes
router.get("/configs", verifySuperAdmin, getSalaryConfigs);
router.post("/set", verifySuperAdmin, setSalary);
router.post("/release", verifySuperAdmin, releaseSalary);
router.get("/history", verifySuperAdmin, getSalaryHistory);

// Admin self-service routes
router.get("/my-history", verifyAdmin, getMyHistory);

export default router;
