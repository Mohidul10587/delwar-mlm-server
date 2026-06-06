import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../app/user/model";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export const verifyUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.accessToken;
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    if (!user.isActive)
      return res.status(403).json({ message: { en: "Account is disabled", bn: "অ্যাকাউন্ট নিষ্ক্রিয়" } });

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
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.isActive)
      return res.status(403).json({ message: { en: "Account is disabled", bn: "অ্যাকাউন্ট নিষ্ক্রিয়" } });

    if (user.role !== "superadmin")
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
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.isActive)
      return res.status(403).json({ message: { en: "Account is disabled", bn: "অ্যাকাউন্ট নিষ্ক্রিয়" } });

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
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.isActive)
      return res.status(403).json({ message: { en: "Account is disabled", bn: "অ্যাকাউন্ট নিষ্ক্রিয়" } });

    if (!["superadmin", "admin", "staff"].includes(user.role))
      return res.status(403).json({ message: "Staff access required" });

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
    if (user.role === "superadmin") return next();

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
