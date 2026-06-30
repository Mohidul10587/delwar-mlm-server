import { Router } from "express";
import { getMyWallet, getMyTransactions, getWalletByUser, adminCredit, adminDebit, adminGiveIncentiveBonus } from "./controller";
import { verifyUser, verifyAdmin, verifySuperAdmin } from "../../middleware/auth";

const router = Router();

router.get("/", verifyUser, getMyWallet);
router.get("/my-transactions", verifyUser, getMyTransactions);
router.get("/:userId", verifyAdmin, getWalletByUser);
router.post("/admin/credit/:userId", verifySuperAdmin, adminCredit);
router.post("/admin/debit/:userId", verifySuperAdmin, adminDebit);
router.post("/admin/incentive-bonus/:userId", verifySuperAdmin, adminGiveIncentiveBonus);

export default router;
