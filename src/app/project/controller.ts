import { Request, Response, NextFunction } from "express";
import { Project } from "./model";
import { ShareSlot } from "./shareSlot.model";
import { Settings } from "../settings/model";
import { Counter } from "../user/counter";

const BATCH_SIZE = 1000;

/**
 * Generate a unique, readable share number using project ID and sequential counter
 * Format: ADPBL-{projectPrefix}-{sequentialNumber}
 * Example: ADPBL-A1B2-00001, ADPBL-C3D4-00002
 */
function generateShareNumber(
  projectId: string,
  sequentialNumber: number
): string {
  // Take first 2 and last 2 characters from project ID to create a unique prefix
  const projectPrefix = projectId.slice(-4).toUpperCase();
  const paddedNumber = String(sequentialNumber).padStart(4, "0");
  return `ADPBL-${projectPrefix}-${paddedNumber}`;
}

/**
 * Atomically reserves `count` sequential share numbers for a specific project
 * and returns the first number in the reserved range.
 *
 * Uses a MongoDB findOneAndUpdate with $inc so that concurrent requests
 * never get overlapping ranges — eliminating the duplicate-key collision
 * that the old findOne().sort() approach suffered from.
 */
async function reserveShareRange(
  projectId: string,
  count: number
): Promise<number> {
  // Use project-specific counter to ensure uniqueness per project
  const counterId = `share-seq-${projectId}`;
  const doc = await Counter.findOneAndUpdate(
    { _id: counterId },
    { $inc: { seq: count } },
    { new: false, upsert: true }
  );
  // doc.seq is the value *before* the increment — that is our start offset.
  // If upserting for the first time, doc may be null; treat as 0.
  return doc?.seq ?? 0;
}

/** Returns true if the share's offer is currently active based on dates */
function isOfferActive(share: any): boolean {
  if (!share.isOffer) return false;
  const now = new Date();
  if (share.offerStartDate && new Date(share.offerStartDate) > now)
    return false;
  if (share.offerEndDate && new Date(share.offerEndDate) < now) return false;
  return true;
}

export const createShare = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const settings = await Settings.findOne();
    const defaults = settings?.defaultShareConfig ?? {};
    const totalShares: number = Number(req.body.totalShares ?? 0);

    const pkg = await Project.create({ ...defaults, ...req.body, totalShares });

    if (totalShares > 0) {
      // Atomically reserve a range of `totalShares` sequential numbers for this project.
      // reserveShareRange returns the value *before* incrementing, so
      // slot numbers are: start+1 … start+totalShares (1-based).
      const start = await reserveShareRange(pkg._id.toString(), totalShares);

      for (let batch = 0; batch < totalShares; batch += BATCH_SIZE) {
        const docs = [];
        const end = Math.min(batch + BATCH_SIZE, totalShares);
        for (let i = batch; i < end; i++) {
          docs.push({
            shareNumber: generateShareNumber(pkg._id.toString(), start + 1 + i),
            projectId: pkg._id,
            status: "available",
            userId: null,
            purchaseId: null,
            reclaimedAt: null,
          });
        }
        await ShareSlot.insertMany(docs, { ordered: true });
      }
    }

    res.status(201).json({ message: "Share created", pkg });
  } catch (err) {
    next(err);
  }
};

export const getShares = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectStatus, isOffer } = req.query;
    // Public endpoint: only show active shares to users
    const filter: any = { isActive: true };
    if (projectStatus) filter.projectStatus = projectStatus;

    const shares = await Project.find(filter).lean();

    // Apply offer-active filter in memory (needs date comparison)
    const result =
      isOffer === "true"
        ? shares
            .filter(isOfferActive)
            .sort((a, b) => (b.offerPriority ?? 0) - (a.offerPriority ?? 0))
        : shares;

    // Attach computed isActiveOffer flag to every share
    const enriched = result.map((s) => ({
      ...s,
      isActiveOffer: isOfferActive(s),
    }));

    res.json({ shares: enriched });
  } catch (err) {
    next(err);
  }
};

// GET /share/admin — returns ALL shares (including inactive) for admin panel
export const getSharesAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectStatus } = req.query;
    const filter: any = {};
    if (projectStatus) filter.projectStatus = projectStatus;

    const shares = await Project.find(filter).lean();
    const enriched = shares.map((s) => ({
      ...s,
      isActiveOffer: isOfferActive(s),
    }));
    res.json({ shares: enriched });
  } catch (err) {
    next(err);
  }
};

export const getShareById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const pkg = await Project.findById(req.params.id).lean();
    if (!pkg) return res.status(404).json({ message: "Share not found" });
    res.json({ pkg: { ...pkg, isActiveOffer: isOfferActive(pkg) } });
  } catch (err) {
    next(err);
  }
};

export const updateShare = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const old = await Project.findById(req.params.id);
    if (!old) return res.status(404).json({ message: "Share not found" });

    const pkg = await Project.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    const newTotal: number =
      req.body.totalShares !== undefined
        ? Number(req.body.totalShares)
        : old.totalShares;
    const diff = newTotal - old.totalShares;

    if (diff > 0) {
      // Atomically reserve `diff` sequential numbers for this project
      const start = await reserveShareRange(old._id.toString(), diff);
      for (let batch = 0; batch < diff; batch += BATCH_SIZE) {
        const docs = [];
        const end = Math.min(batch + BATCH_SIZE, diff);
        for (let i = batch; i < end; i++) {
          docs.push({
            shareNumber: generateShareNumber(old._id.toString(), start + 1 + i),
            projectId: old._id,
            status: "available",
            userId: null,
            purchaseId: null,
            reclaimedAt: null,
          });
        }
        await ShareSlot.insertMany(docs, { ordered: true });
      }
    } else if (diff < 0) {
      // Remove the last |diff| available slots only
      const toRemove = await ShareSlot.find({
        projectId: old._id,
        status: "available",
      })
        .sort({ shareNumber: -1 })
        .limit(Math.abs(diff))
        .select("_id")
        .lean();
      if (toRemove.length > 0)
        await ShareSlot.deleteMany({
          _id: { $in: toRemove.map((s) => s._id) },
        });
    }

    res.json({ message: "Share updated", pkg });
  } catch (err) {
    next(err);
  }
};

export const deleteShare = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const projectId = req.params.id;
    const { force } = req.query; // Allow force deletion with ?force=true

    // Check if project exists
    const pkg = await Project.findById(projectId);
    if (!pkg) return res.status(404).json({ message: "Share not found" });

    // Count share slots by status
    const slotStats = await ShareSlot.aggregate([
      { $match: { projectId: pkg._id } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const stats: Record<string, number> = {};
    slotStats.forEach((stat) => {
      stats[stat._id] = stat.count;
    });

    const totalSlots = Object.values(stats).reduce(
      (sum, count) => sum + count,
      0
    );
    const soldSlots = stats.sold || 0;
    const reclaimedSlots = stats.reclaimed || 0;
    const availableSlots = stats.available || 0;

    console.log(`🗑️  Attempting to delete project "${pkg.title}":`);
    console.log(`   - Total slots: ${totalSlots}`);
    console.log(`   - Available: ${availableSlots}`);
    console.log(`   - Sold: ${soldSlots}`);
    console.log(`   - Reclaimed: ${reclaimedSlots}`);

    // Safety check: prevent deletion if there are sold slots (unless forced)
    if (soldSlots > 0 && force !== "true") {
      return res.status(400).json({
        message: "Cannot delete project with sold shares",
        error: "SHARES_SOLD",
        details: {
          projectTitle: pkg.title,
          totalSlots,
          soldSlots,
          availableSlots,
          reclaimedSlots,
        },
        hint: "Use ?force=true to force delete (this will remove purchase history)",
      });
    }

    // Warning if forced deletion with sold slots
    if (soldSlots > 0 && force === "true") {
      console.log(
        `⚠️  FORCE DELETION: Removing project with ${soldSlots} sold shares!`
      );
    }

    // Delete project and all related share slots in parallel for efficiency
    const [deletedProject, deletedSlots] = await Promise.all([
      Project.findByIdAndDelete(projectId),
      ShareSlot.deleteMany({ projectId }),
    ]);

    // Clean up the project-specific counter
    const counterId = `share-seq-${projectId}`;
    const counterResult = await Counter.deleteOne({ _id: counterId });

    console.log(`✅ Project deleted successfully:`);
    console.log(`   - Project: ${pkg.title}`);
    console.log(`   - Share slots removed: ${deletedSlots.deletedCount}`);
    console.log(
      `   - Counter cleaned: ${counterId} (${
        counterResult.deletedCount > 0 ? "found & deleted" : "not found"
      })`
    );

    res.json({
      message: "Project deleted successfully",
      deletedShareSlots: deletedSlots.deletedCount,
      projectTitle: pkg.title,
      forced: force === "true",
      warning:
        soldSlots > 0 ? `${soldSlots} sold shares were also deleted` : null,
      stats: {
        totalSlots,
        soldSlots,
        availableSlots,
        reclaimedSlots,
      },
    });
  } catch (err) {
    console.error("❌ Error deleting project:", err);
    next(err);
  }
};

// GET /share/cover-slider — public endpoint, returns merged images of all active cover slider shares
export const getCoverSlider = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const shares = await Project.find({
      isCoverSlider: true,
      isActive: true,
    }).lean();
    if (!shares.length)
      return res.json({ images: [], shareIds: [], titles: [] });

    // Merge all images from all selected cover slider shares
    const images = shares.flatMap((s) => s.images ?? []);
    const shareIds = shares.map((s) => s._id);
    const titles = shares.map((s) => s.title);

    res.json({ images, shareIds, titles });
  } catch (err) {
    next(err);
  }
};

// PATCH /share/:id/set-cover-slider — admin toggles a share in/out of the cover slider
export const setCoverSlider = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const share = await Project.findById(req.params.id);
    if (!share) return res.status(404).json({ message: "Share not found" });
    if (!share.isActive)
      return res
        .status(400)
        .json({ message: "Cannot set an inactive share as cover slider" });

    // Toggle: if already set, unset it; otherwise add it to the cover slider
    share.isCoverSlider = true;
    await share.save();

    res.json({ message: "Cover slider updated", projectId: share._id });
  } catch (err) {
    next(err);
  }
};

// PATCH /share/:id/unset-cover-slider — remove cover slider designation
export const unsetCoverSlider = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const share = await Project.findByIdAndUpdate(
      req.params.id,
      { $set: { isCoverSlider: false } },
      { new: true }
    );
    if (!share) return res.status(404).json({ message: "Share not found" });
    res.json({ message: "Cover slider removed" });
  } catch (err) {
    next(err);
  }
};

// POST /share/:id/backfill-slots — creates missing available slots so that
// the total slot count matches share.totalShares. Safe to call multiple times.
export const backfillSlots = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const share = await Project.findById(req.params.id);
    if (!share) return res.status(404).json({ message: "Share not found" });

    const desired = share.totalShares ?? 0;
    if (desired === 0)
      return res.json({
        message: "Share has 0 totalShares — nothing to backfill",
        created: 0,
      });

    const existing = await ShareSlot.countDocuments({ projectId: share._id });
    const diff = desired - existing;

    if (diff <= 0) {
      return res.json({
        message: "Slots already up to date",
        created: 0,
        total: existing,
      });
    }

    // Atomically reserve `diff` sequential numbers for this project
    const start = await reserveShareRange(share._id.toString(), diff);

    let created = 0;
    for (let batch = 0; batch < diff; batch += BATCH_SIZE) {
      const docs = [];
      const end = Math.min(batch + BATCH_SIZE, diff);
      for (let i = batch; i < end; i++) {
        docs.push({
          shareNumber: generateShareNumber(share._id.toString(), start + 1 + i),
          projectId: share._id,
          status: "available",
          userId: null,
          purchaseId: null,
          reclaimedAt: null,
        });
      }
      const result = await ShareSlot.insertMany(docs, { ordered: true });
      created += result.length;
    }

    res.json({
      message: `Backfilled ${created} slots`,
      created,
      total: existing + created,
    });
  } catch (err) {
    next(err);
  }
};

export const getShareStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const [shares, counts] = await Promise.all([
      Project.find().lean(),
      ShareSlot.aggregate([
        {
          $group: {
            _id: { projectId: "$projectId", status: "$status" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Build a map: projectId -> { available, sold, reclaimed }
    const map: Record<
      string,
      { available: number; sold: number; reclaimed: number }
    > = {};
    for (const { _id, count } of counts) {
      const key = _id.projectId.toString();
      if (!map[key]) map[key] = { available: 0, sold: 0, reclaimed: 0 };
      map[key][_id.status as "available" | "sold" | "reclaimed"] = count;
    }

    const stats = shares.map((s) => {
      const key = (s._id as any).toString();
      const { available = 0, sold = 0, reclaimed = 0 } = map[key] ?? {};
      return {
        _id: s._id,
        title: s.title,
        totalShares: s.totalShares,
        sold,
        reclaimed,
        available,
      };
    });

    res.json({ stats });
  } catch (err) {
    next(err);
  }
};

// GET /share/with-stats — returns active shares + slot stats for all shares (admin panel)
export const getSharesWithStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const [shares, counts] = await Promise.all([
      // Admin panel sees ALL shares (including inactive)
      Project.find().lean(),
      ShareSlot.aggregate([
        {
          $group: {
            _id: { projectId: "$projectId", status: "$status" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const map: Record<
      string,
      { available: number; sold: number; reclaimed: number }
    > = {};
    for (const { _id, count } of counts) {
      const key = _id.projectId.toString();
      if (!map[key]) map[key] = { available: 0, sold: 0, reclaimed: 0 };
      map[key][_id.status as "available" | "sold" | "reclaimed"] = count;
    }

    const stats = shares.map((s) => {
      const key = (s._id as any).toString();
      const { available = 0, sold = 0, reclaimed = 0 } = map[key] ?? {};
      return {
        _id: s._id,
        title: s.title,
        totalShares: s.totalShares,
        sold,
        reclaimed,
        available,
      };
    });

    res.json({
      // Return all shares to admin (both active and inactive), with isActiveOffer flag
      shares: shares.map((s) => ({ ...s, isActiveOffer: isOfferActive(s) })),
      stats,
    });
  } catch (err) {
    next(err);
  }
};
