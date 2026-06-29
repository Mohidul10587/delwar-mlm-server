import { Request, Response, NextFunction } from "express";
import { Share } from "./model";
import { ShareSlot } from "./shareSlot.model";
import { Settings } from "../settings/model";

const BATCH_SIZE = 1000;

export const createShare = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await Settings.findOne();
    const defaults = settings?.defaultShareConfig ?? {};
    const totalShares: number = Number(req.body.totalShares ?? 0);

    const pkg = await Share.create({ ...defaults, ...req.body, totalShares });

    if (totalShares > 0) {
      // Find the current highest share number across all slots
      const last = await ShareSlot.findOne().sort({ shareNumber: -1 }).select("shareNumber").lean();
      const lastSeq = last ? parseInt(last.shareNumber.replace("THL-", ""), 10) : 0;

      // Build all docs in memory, insert in batches
      for (let batch = 0; batch < totalShares; batch += BATCH_SIZE) {
        const docs = [];
        const end = Math.min(batch + BATCH_SIZE, totalShares);
        for (let i = batch; i < end; i++) {
          docs.push({
            shareNumber: `THL-${String(lastSeq + 1 + i).padStart(5, "0")}`,
            shareId: pkg._id,
            status: "available",
            userId: null,
            purchaseId: null,
            reclaimedAt: null,
          });
        }
        await ShareSlot.insertMany(docs, { ordered: false });
      }
    }

    res.status(201).json({ message: "Share created", pkg });
  } catch (err) { next(err); }
};

export const getShares = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shares = await Share.find({ isActive: true }).lean();
    res.json({ shares });
  } catch (err) { next(err); }
};

export const getShareById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pkg = await Share.findById(req.params.id).lean();
    if (!pkg) return res.status(404).json({ message: "Share not found" });
    res.json({ pkg });
  } catch (err) { next(err); }
};

export const updateShare = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const old = await Share.findById(req.params.id);
    if (!old) return res.status(404).json({ message: "Share not found" });

    const pkg = await Share.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    const newTotal: number = req.body.totalShares !== undefined ? Number(req.body.totalShares) : old.totalShares;
    const diff = newTotal - old.totalShares;

    if (diff > 0) {
      // Add slots at the end
      const last = await ShareSlot.findOne().sort({ shareNumber: -1 }).select("shareNumber").lean();
      const lastSeq = last ? parseInt(last.shareNumber.replace("THL-", ""), 10) : 0;
      for (let batch = 0; batch < diff; batch += BATCH_SIZE) {
        const docs = [];
        const end = Math.min(batch + BATCH_SIZE, diff);
        for (let i = batch; i < end; i++) {
          docs.push({
            shareNumber: `THL-${String(lastSeq + 1 + i).padStart(5, "0")}`,
            shareId: old._id,
            status: "available",
            userId: null,
            purchaseId: null,
            reclaimedAt: null,
          });
        }
        await ShareSlot.insertMany(docs, { ordered: false });
      }
    } else if (diff < 0) {
      // Remove the last |diff| available slots only
      const toRemove = await ShareSlot.find({ shareId: old._id, status: "available" })
        .sort({ shareNumber: -1 })
        .limit(Math.abs(diff))
        .select("_id")
        .lean();
      if (toRemove.length > 0)
        await ShareSlot.deleteMany({ _id: { $in: toRemove.map((s) => s._id) } });
    }

    res.json({ message: "Share updated", pkg });
  } catch (err) { next(err); }
};

export const deleteShare = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pkg = await Share.findByIdAndDelete(req.params.id);
    if (!pkg) return res.status(404).json({ message: "Share not found" });
    await ShareSlot.deleteMany({ shareId: req.params.id });
    res.json({ message: "Share deleted" });
  } catch (err) { next(err); }
};

export const getShareStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [shares, counts] = await Promise.all([
      Share.find().lean(),
      ShareSlot.aggregate([
        { $group: { _id: { shareId: "$shareId", status: "$status" }, count: { $sum: 1 } } },
      ]),
    ]);

    // Build a map: shareId -> { available, sold, reclaimed }
    const map: Record<string, { available: number; sold: number; reclaimed: number }> = {};
    for (const { _id, count } of counts) {
      const key = _id.shareId.toString();
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
  } catch (err) { next(err); }
};

// GET /share/with-stats — returns active shares + slot stats for all shares
export const getSharesWithStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [shares, counts] = await Promise.all([
      Share.find().lean(),
      ShareSlot.aggregate([
        { $group: { _id: { shareId: "$shareId", status: "$status" }, count: { $sum: 1 } } },
      ]),
    ]);

    const map: Record<string, { available: number; sold: number; reclaimed: number }> = {};
    for (const { _id, count } of counts) {
      const key = _id.shareId.toString();
      if (!map[key]) map[key] = { available: 0, sold: 0, reclaimed: 0 };
      map[key][_id.status as "available" | "sold" | "reclaimed"] = count;
    }

    const stats = shares.map((s) => {
      const key = (s._id as any).toString();
      const { available = 0, sold = 0, reclaimed = 0 } = map[key] ?? {};
      return { _id: s._id, title: s.title, totalShares: s.totalShares, sold, reclaimed, available };
    });

    res.json({ shares: shares.filter((s) => (s as any).isActive), stats });
  } catch (err) { next(err); }
};
