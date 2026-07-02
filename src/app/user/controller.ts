import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { IUser, User as Model } from "./model";
import { Wallet } from "../wallet/model";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { registerSchema, adminRegisterSchema, loginSchema } from "./validation";
import { JWT_SECRET, JWT_REFRESH_SECRET, cookieOpts } from "../../utils/authConfig";

declare module "express" {
  interface Request {
    user?: IUser;
  }
}

const defaultPermissionsByRole: Record<string, string[]> = {
  admin: ["purchase.review"],
  staff: ["purchase.review"],
};

const generateTokens = (id: string) => {
  const accessToken = jwt.sign({ id }, JWT_SECRET, { expiresIn: "30m" });
  const refreshToken = jwt.sign({ id }, JWT_REFRESH_SECRET, {
    expiresIn: "1d",
  });
  return { accessToken, refreshToken };
};

/** Build generation ancestor list (no side needed). */
async function buildGenerationAncestors(
  referrerId: mongoose.Types.ObjectId | null
): Promise<{ level: number; userId: mongoose.Types.ObjectId }[]> {
  if (!referrerId) return [];
  const parent = await Model.findById(referrerId)
    .select("generationAncestors")
    .lean();
  if (!parent) return [];
  const parentAncestors = ((parent as any).generationAncestors ?? []).map(
    (a: { level: number; userId: mongoose.Types.ObjectId }) => ({
      level: a.level + 1,
      userId: a.userId,
    })
  );
  return [{ level: 1, userId: referrerId }, ...parentAncestors];
}

/**
 * Cascade generation ancestor updates to all referral descendants (BFS).
 * Finds children by generationAncestors[0].userId === rootId.
 */
async function cascadeGenerationAncestors(
  rootId: mongoose.Types.ObjectId
): Promise<void> {
  let queue: mongoose.Types.ObjectId[] = [rootId];
  while (queue.length > 0) {
    const children = await Model.find({
      "generationAncestors.0.userId": { $in: queue },
    })
      .select("_id generationAncestors")
      .lean();
    if (children.length === 0) break;
    await Promise.all(
      children.map(async (child) => {
        const parentId = (child as any).generationAncestors?.[0]
          ?.userId as mongoose.Types.ObjectId;
        const newAncestors = await buildGenerationAncestors(parentId);
        return Model.updateOne(
          { _id: child._id },
          { $set: { generationAncestors: newAncestors } }
        );
      })
    );
    queue = children.map((c) => c._id as mongoose.Types.ObjectId);
  }
}

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, username, phone, password, referrerUsername } =
      registerSchema.parse(req.body);

    const existingUsername = await Model.findOne({ username });
    if (existingUsername)
      return res.status(400).json({ message: "Username already taken" });

    let referrerId: mongoose.Types.ObjectId | null = null;
    if (referrerUsername) {
      const referrer = await Model.findOne({
        username: referrerUsername,
      }).select("_id");
      if (!referrer)
        return res.status(400).json({ message: "Referrer not found" });
      referrerId = referrer._id;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const generationAncestors = await buildGenerationAncestors(referrerId);
    const user = await Model.create({
      name,
      username,
      phone,
      password: hashedPassword,
      generationAncestors,
    });

    await Wallet.create({ userId: user._id });

    const siblings = await Model.find({ phone, _id: { $ne: user._id } }).select(
      "_id"
    );
    if (siblings.length > 0) {
      const siblingIds = siblings.map((s) => s._id);
      await Model.updateMany(
        { _id: { $in: siblingIds } },
        { $addToSet: { linkedPhoneAccounts: user._id } }
      );
      user.linkedPhoneAccounts = siblingIds as mongoose.Types.ObjectId[];
      await user.save();
    }

    const { accessToken, refreshToken } = generateTokens(user._id.toString());
    res.cookie("accessToken", accessToken, cookieOpts());
    res.cookie("refreshToken", refreshToken, cookieOpts());

    res.status(201).json({ message: "Registered successfully", user });
  } catch (err) {
    next(err);
  }
};

// Helper: resolve username → ObjectId
const resolveUsername = async (
  username: string | undefined,
  label: string,
  res: Response
) => {
  if (!username) return { id: null, error: false };
  const found = await Model.findOne({ username }).select("_id");
  if (!found) {
    res.status(400).json({ message: `${label} not found` });
    return { id: null, error: true };
  }
  return { id: found._id as mongoose.Types.ObjectId, error: false };
};

export const adminRegister = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, username, phone, password, referrerUsername, role } =
      adminRegisterSchema.parse(req.body);

    const existingUsername = await Model.findOne({ username });
    if (existingUsername)
      return res.status(400).json({ message: "Username already taken" });

    const { id: referrerId, error: refErr } = await resolveUsername(
      referrerUsername,
      "Referrer",
      res
    );
    if (refErr) return;

    const hashedPassword = await bcrypt.hash(password, 10);
    const generationAncestors = await buildGenerationAncestors(referrerId);
    const user = await Model.create({
      name,
      username,
      phone,
      password: hashedPassword,
      role,
      permissions: defaultPermissionsByRole[role] ?? [],
      generationAncestors,
    });

    await Wallet.create({ userId: user._id });

    const siblings = await Model.find({ phone, _id: { $ne: user._id } }).select(
      "_id"
    );
    if (siblings.length > 0) {
      const siblingIds = siblings.map((s) => s._id);
      await Model.updateMany(
        { _id: { $in: siblingIds } },
        { $addToSet: { linkedPhoneAccounts: user._id } }
      );
      user.linkedPhoneAccounts = siblingIds as mongoose.Types.ObjectId[];
      await user.save();
    }

    res.status(201).json({ message: "User registered successfully", user });
  } catch (err) {
    next(err);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { username, password } = loginSchema.parse(req.body);

    const user = await Model.findOne({ username });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.isActive)
      return res.status(403).json({ message: "Account is inactive" });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ message: "Invalid password" });

    const { accessToken, refreshToken } = generateTokens(user._id.toString());
    res.cookie("accessToken", accessToken, cookieOpts());
    res.cookie("refreshToken", refreshToken, cookieOpts());

    res.json({ message: "Login successful", user });
  } catch (err) {
    next(err);
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ message: "No refresh token" });

    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as { id: string };
    const user = await Model.findById(decoded.id).select("-password");
    if (!user)
      return res.status(401).json({ message: "Invalid refresh token" });

    const newAccessToken = jwt.sign({ id: user._id.toString() }, JWT_SECRET, {
      expiresIn: "30m",
    });
    res.cookie("accessToken", newAccessToken, cookieOpts());

    res.json({ success: true, user });
  } catch {
    res.status(401).json({ message: "Refresh failed" });
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    res.clearCookie("accessToken", cookieOpts());
    res.clearCookie("refreshToken", cookieOpts());
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
};

export const verify = async (req: Request, res: Response) => {
  try {
    const token = req.cookies.accessToken;
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    const user = await Model.findById(decoded.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ user });
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

// Switch to another linked account (same phone number) without re-login (rule 6)
export const switchAccount = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { targetUserId } = req.params;
    const currentUser = req.user!;

    const isLinked = currentUser.linkedPhoneAccounts.some(
      (id) => id.toString() === targetUserId
    );
    if (!isLinked)
      return res.status(403).json({ message: "Account not linked" });

    const targetUser = await Model.findById(targetUserId).select("-password");
    if (!targetUser)
      return res.status(404).json({ message: "Target account not found" });

    if (!targetUser.isActive)
      return res.status(403).json({ message: "Target account is inactive" });

    const { accessToken, refreshToken } = generateTokens(
      targetUser._id.toString()
    );
    res.cookie("accessToken", accessToken, cookieOpts());
    res.cookie("refreshToken", refreshToken, cookieOpts());

    res.json({ message: "Switched account", user: targetUser });
  } catch (err) {
    next(err);
  }
};

export const updateCoverImage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { coverImage } = req.body;
    if (!coverImage) return res.status(400).json({ message: "Cover image URL required" });
    const user = await Model.findByIdAndUpdate(
      req.user?._id,
      { $set: { coverImage } },
      { new: true }
    ).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "Cover image updated", user });
  } catch (err) {
    next(err);
  }
};

export const updateImage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ message: "Image URL required" });
    const user = await Model.findByIdAndUpdate(
      req.user?._id,
      { $set: { image } },
      { new: true }
    ).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "Image updated", user });
  } catch (err) {
    next(err);
  }
};

export const updatePhone = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { phone } = req.body;
    // M-12 fix: basic phone validation
    if (!phone || !/^[0-9+\-\s]{7,15}$/.test(String(phone).trim())) {
      return res.status(400).json({ message: "Invalid phone number format" });
    }
    const user = await Model.findByIdAndUpdate(
      req.user?._id,
      { $set: { phone: String(phone).trim() } },
      { new: true }
    ).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "Phone updated", user });
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await Model.findById(req.user?._id);
    if (!user) return res.status(404).json({ message: "User not found" });
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid)
      return res.status(401).json({ message: "Current password is incorrect" });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: "Password changed" });
  } catch (err) {
    next(err);
  }
};

export const toggleUserActive = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await Model.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    user.isActive = !user.isActive;
    await user.save();
    res.json({
      message: user.isActive ? "User activated" : "User disabled",
      user,
    });
  } catch (err) {
    next(err);
  }
};

export const adminUpdatePhone = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { phone } = req.body;
    const user = await Model.findByIdAndUpdate(
      req.params.id,
      { $set: { phone } },
      { new: true }
    ).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "Phone updated", user });
  } catch (err) {
    next(err);
  }
};

export const adminUpdatePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { password } = req.body;
    if (!password)
      return res.status(400).json({ message: "Password required" });
    const hashed = await bcrypt.hash(password, 10);
    const user = await Model.findByIdAndUpdate(
      req.params.id,
      { $set: { password: hashed } },
      { new: true }
    ).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "Password updated" });
  } catch (err) {
    next(err);
  }
};

export const getUserDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await Model.findById(req.params.id).select("-password").lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    const referrerId = (user as any).generationAncestors?.[0]?.userId;
    const referrer = referrerId
      ? await Model.findById(referrerId).select("name username phone").lean()
      : null;

    const wallet = await Wallet.findOne({ userId: user._id }).lean();

    res.json({ user: { ...user, referrer }, wallet });
  } catch (err) {
    next(err);
  }
};

export const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";
    const skip = (page - 1) * limit;

    const query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      Model.find(query)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Model.countDocuments(query),
    ]);

    res.json({ users, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await Model.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    // ⚠️ FUTURE: if admin deletion should be allowed, remove "admin" from this guard.
    if (user.role === "superadmin" || user.role === "admin")
      return res.status(403).json({ message: "Cannot delete superadmin or admin" });
    await Model.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted" });
  } catch (err) {
    next(err);
  }
};

export const adminUpdateRelations = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { referrerUsername } = req.body as {
      referrerUsername?: string;
    };

    const user = await Model.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    let newReferrerId: mongoose.Types.ObjectId | null =
      user.generationAncestors[0]?.userId ?? null;

    if (referrerUsername !== undefined) {
      if (referrerUsername === "") {
        newReferrerId = null;
      } else {
        const ref = await Model.findOne({ username: referrerUsername }).select(
          "_id"
        );
        if (!ref)
          return res.status(400).json({ message: "Referrer not found" });
        newReferrerId = ref._id;
      }
    }

    const generationAncestors = await buildGenerationAncestors(newReferrerId);
    user.generationAncestors = generationAncestors as any;
    await user.save();

    await Promise.all([
      referrerUsername !== undefined
        ? cascadeGenerationAncestors(user._id)
        : Promise.resolve(),
    ]);

    res.json({ message: "Updated successfully", user });
  } catch (err) {
    next(err);
  }
};

export const updateInfo = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      nominee,
      nominee2,
      district,
      upazila,
      dateOfBirth,
      paymentMethods,
    } = req.body;
    const user = await Model.findById(req.user!._id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (nominee !== undefined) user.nominee = nominee;
    if (nominee2 !== undefined) user.nominee2 = nominee2;
    if (district !== undefined) user.district = district;
    if (upazila !== undefined) user.upazila = upazila;
    if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth;
    if (paymentMethods !== undefined) user.paymentMethods = paymentMethods;
    await user.save();
    res.json({ message: "Info updated successfully", user });
  } catch (err) {
    next(err);
  }
};

export const getLinkedAccounts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const currentUser = req.user!;
    const ids: mongoose.Types.ObjectId[] = currentUser.linkedPhoneAccounts;

    if (!ids || ids.length === 0) {
      return res.json({ users: [] });
    }

    const users = await Model.find({ _id: { $in: ids } })
      .select("_id username name image role isActive")
      .lean();

    res.json({ users });
  } catch (err) {
    next(err);
  }
};

export const updatePermissions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { permissions } = req.body as { permissions?: unknown };
    if (
      !Array.isArray(permissions) ||
      permissions.some((p) => typeof p !== "string")
    ) {
      return res.status(400).json({
        message: "permissions must be string array",
      });
    }

    const user = await Model.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    // ⚠️ FUTURE: when admin/superadmin permissions diverge, allow editing admin permissions here.
    if (user.role === "superadmin" || user.role === "admin") {
      return res.status(400).json({
        message: "Superadmin/admin permissions are implicit",
      });
    }

    user.permissions = permissions;
    await user.save();
    res.json({
      message: "Permissions updated",
      user,
    });
  } catch (err) {
    next(err);
  }
};
