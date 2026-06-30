import { Router } from "express";
import { sendTransfer, getTransferFee } from "./controller";
import { verifyUser } from "../../middleware/auth";

const router = Router();

router.get("/fee", verifyUser, getTransferFee);
router.post("/", verifyUser, sendTransfer);

export default router;
