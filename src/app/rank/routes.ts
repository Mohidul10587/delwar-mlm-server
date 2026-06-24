import { Router } from "express";
import { getRanks, createRank, updateRank, deleteRank, getMyRank, releaseMonthlySalaries, replaceAllRanks } from "./controller";
import { verifyUser, verifySuperAdmin } from "../../middleware/auth";

const router = Router();

router.get("/my", verifyUser, getMyRank);
router.get("/", getRanks);
router.post("/", verifySuperAdmin, createRank);
router.post("/release-salaries", verifySuperAdmin, releaseMonthlySalaries);
router.put("/replace-all", verifySuperAdmin, replaceAllRanks);
router.put("/:id", verifySuperAdmin, updateRank);
router.delete("/:id", verifySuperAdmin, deleteRank);

export default router;
