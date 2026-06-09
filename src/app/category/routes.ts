import { Router } from "express";
import { getCategories, createCategory, updateCategory, deleteCategory } from "./controller";
import { verifySuperAdmin } from "../../middleware/auth";

const router = Router();

router.get("/", getCategories);
router.post("/", verifySuperAdmin, createCategory);
router.put("/:id", verifySuperAdmin, updateCategory);
router.delete("/:id", verifySuperAdmin, deleteCategory);

export default router;
