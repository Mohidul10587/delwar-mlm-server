import { Router } from "express";
import { createNotice, getNotices, deleteNotice } from "./controller";
import { verifySuperAdmin, verifyUser } from "../../middleware/auth";

const router = Router();
router.get("/", verifyUser, getNotices);
router.post("/", verifySuperAdmin, createNotice);
router.delete("/:id", verifySuperAdmin, deleteNotice);

export default router;
