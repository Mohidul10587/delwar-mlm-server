import { Router } from "express";
import { getLedger, getAllTransactions } from "./controller";
import { verifySuperAdmin } from "../../middleware/auth";

const router = Router();

router.get("/", verifySuperAdmin, getLedger);
router.get("/transactions", verifySuperAdmin, getAllTransactions);

export default router;
