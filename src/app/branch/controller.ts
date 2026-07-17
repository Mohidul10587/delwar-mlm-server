import { Request, Response, NextFunction } from "express";
import { Branch } from "./model";
import { User } from "../user/model";

/** GET /branch — public list of active branches */
export const getBranches = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const branches = await Branch.find({ isActive: true })
      .populate("managerId", "name username phone")
      .sort({ name: 1 })
      .lean();
    res.json({ branches });
  } catch (err) {
    next(err);
  }
};

/** GET /branch/all — superadmin: all branches (active + inactive) */
export const getAllBranches = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const branches = await Branch.find()
      .populate("managerId", "name username phone")
      .sort({ createdAt: -1 })
      .lean();
    res.json({ branches });
  } catch (err) {
    next(err);
  }
};

/** POST /branch — superadmin creates a branch */
export const createBranch = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, address, managerUsername } = req.body;
    if (!name || !managerUsername)
      return res
        .status(400)
        .json({ message: "Branch name and manager username are required" });

    // Find the manager by username
    const manager = await User.findOne({ username: managerUsername });
    if (!manager)
      return res.status(404).json({ message: "Manager user not found" });

    // Promote user to branch_manager role if not already
    if (manager.role !== "branch_manager") {
      manager.role = "branch_manager" as any;
      await manager.save();
    }

    const branch = await Branch.create({
      name: name.trim(),
      address: address?.trim() ?? "",
      managerId: manager._id,
    });

    const populated = await Branch.findById(branch._id)
      .populate("managerId", "name username phone")
      .lean();

    res.status(201).json({ message: "Branch created", branch: populated });
  } catch (err: any) {
    if (err.code === 11000)
      return res.status(400).json({ message: "Branch name already exists" });
    next(err);
  }
};

/** PUT /branch/:id — superadmin updates a branch */
export const updateBranch = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, address, managerUsername, isActive } = req.body;
    const branch = await Branch.findById(req.params.id);
    if (!branch) return res.status(404).json({ message: "Branch not found" });

    if (name) branch.name = name.trim();
    if (address !== undefined) branch.address = address.trim();
    if (typeof isActive === "boolean") branch.isActive = isActive;

    if (managerUsername) {
      // Demote old manager back to user (if not superadmin/admin)
      const oldManager = await User.findById(branch.managerId);
      if (
        oldManager &&
        oldManager.role === "branch_manager" &&
        oldManager.username !== managerUsername
      ) {
        // Check if this manager manages another branch; if not, demote
        const otherBranch = await Branch.findOne({
          managerId: oldManager._id,
          _id: { $ne: branch._id },
        });
        if (!otherBranch) {
          oldManager.role = "user" as any;
          await oldManager.save();
        }
      }

      const newManager = await User.findOne({ username: managerUsername });
      if (!newManager)
        return res.status(404).json({ message: "New manager user not found" });

      if (newManager.role !== "branch_manager") {
        newManager.role = "branch_manager" as any;
        await newManager.save();
      }
      branch.managerId = newManager._id;
    }

    await branch.save();
    const populated = await Branch.findById(branch._id)
      .populate("managerId", "name username phone")
      .lean();
    res.json({ message: "Branch updated", branch: populated });
  } catch (err) {
    next(err);
  }
};

/** DELETE /branch/:id — superadmin deletes a branch */
export const deleteBranch = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const branch = await Branch.findByIdAndDelete(req.params.id);
    if (!branch) return res.status(404).json({ message: "Branch not found" });

    // Demote manager if they only managed this branch
    const otherBranch = await Branch.findOne({ managerId: branch.managerId });
    if (!otherBranch) {
      await User.findByIdAndUpdate(branch.managerId, { role: "user" });
    }

    res.json({ message: "Branch deleted" });
  } catch (err) {
    next(err);
  }
};
