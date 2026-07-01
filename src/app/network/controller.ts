import { Request, Response, NextFunction } from "express";
import { User } from "../user/model";

interface TreeNode {
  _id: string;
  username: string;
  name: string;
  children: TreeNode[];
}

// M-07 fix: O(n) tree build using a pre-indexed map instead of O(n²) filter per node
const buildTreeFromFlat = (nodes: any[], parentId: string): TreeNode[] => {
  // Build parent→children map once
  const childMap = new Map<string, any[]>();
  for (const n of nodes) {
    const pid = n.generationAncestors?.[0]?.userId?.toString();
    if (!pid) continue;
    if (!childMap.has(pid)) childMap.set(pid, []);
    childMap.get(pid)!.push(n);
  }
  const buildNode = (pid: string): TreeNode[] =>
    (childMap.get(pid) ?? []).map((n) => ({
      _id: n._id.toString(),
      username: n.username,
      name: n.name,
      children: buildNode(n._id.toString()),
    }));
  return buildNode(parentId);
};

export const getDownline = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // M-14 fix: pagination added — large networks won't crash
    const page  = parseInt(req.query.page  as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;
    const skip  = (page - 1) * limit;

    const [all, total] = await Promise.all([
      User.find({ "generationAncestors.userId": req.user!._id })
        .select("_id username name generationAncestors")
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments({ "generationAncestors.userId": req.user!._id }),
    ]);
    res.json({ tree: buildTreeFromFlat(all, req.user!._id.toString()), total, page, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};

export const getUpline = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const me = await User.findById(req.user!._id).select("generationAncestors").lean();
    const level1 = (me as any)?.generationAncestors?.[0];
    if (!level1) return res.json({ upline: null });
    const parent = await User.findById(level1.userId).select("_id username name").lean();
    if (!parent) return res.json({ upline: null });
    res.json({ upline: { _id: parent._id.toString(), username: parent.username, name: parent.name } });
  } catch (err) { next(err); }
};

export const getReferrals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const referrals = await User.find({ "generationAncestors.0.userId": req.user!._id })
      .select("_id username name phone createdAt")
      .lean();
    res.json({ referrals });
  } catch (err) { next(err); }
};

// GET /network/generations
// Returns all downline members grouped by generation level
export const getGenerations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!._id.toString();

    const all = await User.find({ "generationAncestors.userId": req.user!._id })
      .select("_id username name phone createdAt generationAncestors directSalesCount personalSharesCount currentRank")
      .lean();

    // Group each user by the level they appear at under our user
    const genMap: Record<number, any[]> = {};
    for (const u of all) {
      const entry = (u as any).generationAncestors?.find(
        (a: any) => a.userId?.toString() === userId
      );
      if (!entry) continue;
      const level: number = entry.level;
      if (!genMap[level]) genMap[level] = [];
      genMap[level].push({
        _id: u._id,
        username: (u as any).username,
        name: (u as any).name,
        phone: (u as any).phone,
        createdAt: (u as any).createdAt,
        directSalesCount: (u as any).directSalesCount ?? 0,
        personalSharesCount: (u as any).personalSharesCount ?? 0,
        currentRank: (u as any).currentRank ?? null,
      });
    }

    const maxGen = Object.keys(genMap).length > 0
      ? Math.max(...Object.keys(genMap).map(Number))
      : 0;

    const generations = Array.from({ length: maxGen }, (_, i) => ({
      generation: i + 1,
      members: genMap[i + 1] ?? [],
      count: (genMap[i + 1] ?? []).length,
    }));

    res.json({ generations, totalMembers: all.length });
  } catch (err) { next(err); }
};
