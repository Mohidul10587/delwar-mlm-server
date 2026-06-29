import { Router } from "express";
import { getMyCertificates, downloadCertificate } from "./controller";
import { verifyUser } from "../../middleware/auth";

const router = Router();

router.get("/my", verifyUser, getMyCertificates);
router.get("/:id/download", verifyUser, downloadCertificate);

export default router;
