import { Router } from "express";
import { getMyCertificates } from "./controller";
import { verifyUser } from "../../middleware/auth";

const router = Router();

router.get("/my", verifyUser, getMyCertificates);

export default router;
