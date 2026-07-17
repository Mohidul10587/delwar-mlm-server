"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = require("./controller");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
// ── Public routes ──────────────────────────────────────────────────────────────
router.get("/", controller_1.getCategories);
router.get("/by-slug/:slug", controller_1.getCategoryBySlug);
router.get("/by-slug/:slug/projects", controller_1.getCategoryProjects);
// ── Protected routes ───────────────────────────────────────────────────────────
router.post("/", auth_1.verifySuperAdmin, controller_1.createCategory);
router.patch("/reorder", auth_1.verifySuperAdmin, controller_1.reorderCategories);
router.put("/:id", auth_1.verifySuperAdmin, controller_1.updateCategory);
router.delete("/:id", auth_1.verifySuperAdmin, controller_1.deleteCategory);
exports.default = router;
