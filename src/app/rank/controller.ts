import { Request, Response, NextFunction } from "express";
import { Settings } from "../settings/model";
import { User } from "../user/model";

// ── helpers ──────────────────────────────────────────────────────────────────

const getSettings = async () => {
  let s = await Settings.findOne();
  if (!s) s = await Settings.create({});
  return s;
};

/** Given sales counts, find the highest rank the user qualifies for */
const resolveRank = (ranks: any[], directSales: number, teamSales: number): string | null => {
  const qualified = ranks
    .filter((r) => directSales >= r.minDirectSales && teamSales >= r.minTeamSales)
    .sort((a, b) => b.order - a.order);
  return qualified[0]?.name ?? null;
};

// ── rank CRUD (stored in Settings) ───────────────────────────────────────────

export const getRanks = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const s = await getSettings();
    const ranks = (s.ranks ?? []).sort((a: any, b: any) => a.order - b.order);
    res.json({ ranks });
  } catch (err) { next(err); }
};

export const createRank = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const s = await getSettings();
    const { name, minDirectSales = 0, minTeamSales = 0, order = 0 } = req.body;
    (s.ranks as any[]).push({ name, minDirectSales, minTeamSales, order });
    await s.save();
    res.status(201).json({ message: "Rank created", ranks: s.ranks });
  } catch (err) { next(err); }
};

export const updateRank = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const s = await getSettings();
    const rank = (s.ranks as any[]).find((r) => r._id.toString() === req.params.id);
    if (!rank) return res.status(404).json({ message: "Rank not found" });
    Object.assign(rank, req.body);
    await s.save();
    res.json({ message: "Rank updated", ranks: s.ranks });
  } catch (err) { next(err); }
};

export const deleteRank = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const s = await getSettings();
    (s as any).ranks = (s.ranks as any[]).filter((r) => r._id.toString() !== req.params.id);
    await s.save();
    res.json({ message: "Rank deleted" });
  } catch (err) { next(err); }
};

// ── user rank ─────────────────────────────────────────────────────────────────

export const getMyRank = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user!._id).select("directSalesCount teamSalesCount currentRank").lean();
    const s = await getSettings();
    const allRanks = (s.ranks ?? []).sort((a: any, b: any) => a.order - b.order);
    const directSales = user?.directSalesCount ?? 0;
    const teamSales = user?.teamSalesCount ?? 0;
    const currentRankName = user?.currentRank ?? null;
    const currentRank = allRanks.find((r: any) => r.name === currentRankName) ?? null;
    const nextRank = allRanks.find((r: any) => r.order > (currentRank?.order ?? -1)) ?? null;

    res.json({ directSalesCount: directSales, teamSalesCount: teamSales, currentRank, nextRank, allRanks });
  } catch (err) { next(err); }
};

// ── called internally after commission distribution ───────────────────────────

export const recalcUserRank = async (userId: string) => {
  try {
    const user = await User.findById(userId).select("directSalesCount teamSalesCount");
    if (!user) return;
    const s = await Settings.findOne();
    const ranks = s?.ranks ?? [];
    const newRank = resolveRank(ranks as any[], user.directSalesCount, user.teamSalesCount);
    if (newRank !== user.currentRank) {
      await User.findByIdAndUpdate(userId, { currentRank: newRank });
    }
  } catch (err) {
    console.error("recalcUserRank error:", err);
  }
};
