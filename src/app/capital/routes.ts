import { Router } from "express";
import { verifySuperAdmin } from "../../middleware/auth";
import { create, getAll, getOne, remove, update } from "./controller";

const router = Router();
router.use(verifySuperAdmin);
router.get("/", getAll);
router.post("/", create);
router.get("/:id", getOne);
router.put("/:id", update);
router.delete("/:id", remove);
export default router;
