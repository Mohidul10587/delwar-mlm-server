import { Router } from "express";
import { getRanks, createRank, updateRank, deleteRank, getMyRank } from "./controller";
import { verifyUser, verifySuperAdmin } from "../../middleware/auth";

const router = Router();

router.get("/my", verifyUser, getMyRank);
router.get("/", getRanks);
router.post("/", verifySuperAdmin, createRank);
router.put("/:id", verifySuperAdmin, updateRank);
router.delete("/:id", verifySuperAdmin, deleteRank);

export default router;
