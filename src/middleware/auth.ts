import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../app/user/model";
import { JWT_SECRET } from "../utils/authConfig";

// ─── Role helpers ─────────────────────────────────────────────────────────────

/** Roles that have full super-admin level access. */
const SUPER_ROLES = ["superadmin"] as const;
type SuperRole = (typeof SUPER_ROLES)[number];

const isSuperRole = (role: string): role is SuperRole =>
  (SUPER_ROLES as readonly string[]).includes(role);

// ─── Middleware ───────────────────────────────────────────────────────────────

export const verifyUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.accessToken;
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    if (!user.isActive)
      return res.status(403).json({ message: "Account is disabled" });

    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Token expired" });
  }
};

export const verifySuperAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.accessToken;
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.isActive)
      return res.status(403).json({ message: "Account is disabled" });

    // ⚠️ FUTURE: when admin/superadmin permissions diverge, split this check.
    if (!isSuperRole(user.role))
      return res.status(403).json({ message: "Superadmin access required" });

    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

export const verifyAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.accessToken;
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.isActive)
      return res.status(403).json({ message: "Account is disabled" });

    if (!["superadmin", "admin"].includes(user.role))
      return res.status(403).json({ message: "Admin access required" });

    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

export const verifyStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.accessToken;
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.isActive)
      return res.status(403).json({ message: "Account is disabled" });

    if (!["superadmin", "admin", "staff"].includes(user.role))
      return res.status(403).json({ message: "Staff access required" });

    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

export const verifyBranchManager = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.accessToken;
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.isActive)
      return res.status(403).json({ message: "Account is disabled" });

    // Admin roles can manage all withdrawals; branch managers are restricted
    // to their assigned branch by the withdrawal controller.
    if (!["superadmin", "admin", "branch_manager"].includes(user.role))
      return res.status(403).json({ message: "Withdrawal reviewer access required" });

    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    // ⚠️ FUTURE: when admin/superadmin permissions diverge, remove admin from this bypass.
    if (isSuperRole(user.role)) return next();

    const granted = Array.isArray(user.permissions) && user.permissions.includes(permission);
    if (!granted) {
      return res.status(403).json({
        message: {
          en: `Permission denied: ${permission}`,
          bn: `পারমিশন নেই: ${permission}`,
        },
      });
    }
    next();
  };
};
