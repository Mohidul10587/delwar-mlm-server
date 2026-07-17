import { Router } from "express";
import {
  getBranches,
  getAllBranches,
  createBranch,
  updateBranch,
  deleteBranch,
} from "./controller";
import { verifyUser, verifySuperAdmin } from "../../middleware/auth";

const router = Router();

// Public (logged-in user): get active branches list for withdrawal form
router.get("/", verifyUser, getBranches);

// Superadmin only
router.get("/all", verifySuperAdmin, getAllBranches);
router.post("/", verifySuperAdmin, createBranch);
router.put("/:id", verifySuperAdmin, updateBranch);
router.delete("/:id", verifySuperAdmin, deleteBranch);

export default router;
