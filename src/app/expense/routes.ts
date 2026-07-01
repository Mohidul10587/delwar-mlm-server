import { Router } from "express";
import { createExpense, getExpenses, deleteExpense } from "./controller";
import { verifySuperAdmin } from "../../middleware/auth";

const router = Router();

router.get("/", verifySuperAdmin, getExpenses);
router.post("/", verifySuperAdmin, createExpense);
router.delete("/:id", verifySuperAdmin, deleteExpense);

export default router;
