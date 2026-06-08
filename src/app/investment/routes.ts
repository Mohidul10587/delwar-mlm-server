import { Router } from "express";
import { createInvestment, getMyInvestments, getAllInvestments, distributeProfit } from "./controller";
import { verifySuperAdmin, verifyUser } from "../../middleware/auth";

const router = Router();

router.post("/", verifyUser, createInvestment);
router.get("/my", verifyUser, getMyInvestments);
router.get("/all", verifySuperAdmin, getAllInvestments);
router.get("/:id", verifySuperAdmin, async (req, res, next) => {
  try {
    const inv = await (await import("./model")).Investment
      .findById(req.params.id).populate("userId", "name username phone").lean();
    if (!inv) return res.status(404).json({ message: "Not found" });
    res.json({ investment: inv });
  } catch (err) { next(err); }
});
router.post("/:id/distribute-profit", verifySuperAdmin, distributeProfit);

export default router;
