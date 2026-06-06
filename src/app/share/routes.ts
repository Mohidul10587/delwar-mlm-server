import { Router } from "express";
import {
  createShare,
  getShares,
  getShareById,
  updateShare,
  deleteShare,
} from "./controller";
import { verifySuperAdmin } from "../../middleware/auth";

const router = Router();

router.get("/", getShares);
router.get("/:id", getShareById);
router.post("/", verifySuperAdmin, createShare);
router.put("/:id", verifySuperAdmin, updateShare);
router.delete("/:id", verifySuperAdmin, deleteShare);

export default router;
