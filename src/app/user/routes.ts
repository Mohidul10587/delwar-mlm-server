import { Router } from "express";
import {
  register, adminRegister, login, verify, logout, refresh,
  switchAccount, toggleUserActive, getUsers, deleteUser,
  adminUpdatePhone, adminUpdatePassword, adminUpdateRelations,
  updatePhone, updateImage, changePassword, updatePermissions,
} from "./controller";
import { getSuperAdminStats } from "./stats.controller";
import { verifyUser, verifyAdmin, verifySuperAdmin } from "../../middleware/auth";

const router = Router();

router.post("/register", register);
router.post("/admin/register", verifySuperAdmin, adminRegister);
router.post("/login", login);
router.get("/verify", verify);
router.post("/refresh", refresh);
router.post("/logout", verifyUser, logout);

router.post("/switch/:targetUserId", verifyUser, switchAccount);

router.get("/stats", verifySuperAdmin, getSuperAdminStats);
router.get("/list", verifyAdmin, getUsers);
router.delete("/admin/delete/:id", verifySuperAdmin, deleteUser);
router.patch("/admin/toggle/:id", verifyAdmin, toggleUserActive);
router.put("/admin/update/:id", verifyAdmin, adminUpdatePhone);
router.put("/admin/password/:id", verifyAdmin, adminUpdatePassword);
router.put("/admin/relations/:id", verifySuperAdmin, adminUpdateRelations);
router.put("/admin/permissions/:id", verifySuperAdmin, updatePermissions);
router.put("/update-phone", verifyUser, updatePhone);
router.put("/update-image", verifyUser, updateImage);
router.put("/change-password", verifyUser, changePassword);

export default router;
