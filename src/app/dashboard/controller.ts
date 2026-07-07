import { Request, Response, NextFunction } from "express";
import { Wallet } from "../wallet/model";
import { Purchase } from "../purchase/model";
import { Settings } from "../settings/model";
import { User } from "../user/model";
import { Project } from "../project/model";
import { Event } from "../event/model";

// M-08 fix: O(n) tree build using pre-indexed parent→children map
const buildTree = (nodes: any[], parentId: string): any[] => {
  const childMap = new Map<string, any[]>();
  for (const n of nodes) {
    const pid = n.generationAncestors?.[0]?.userId?.toString();
    if (!pid) continue;
    if (!childMap.has(pid)) childMap.set(pid, []);
    childMap.get(pid)!.push(n);
  }
  const buildNode = (pid: string): any[] =>
    (childMap.get(pid) ?? []).map((n) => ({
      _id: n._id.toString(),
      username: n.username,
      name: n.name,
      children: buildNode(n._id.toString()),
    }));
  return buildNode(parentId);
};

// GET /dashboard/user
export const getUserDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!._id;

    const [wallet, purchases, user, downlineNodes, settings, shares, events] = await Promise.all([
      Wallet.findOne({ userId }).lean(),
      Purchase.find({ userId }).populate("shareId", "title cashPrice installment image").sort({ createdAt: -1 }).lean(),
      User.findById(userId).select("directSalesCount teamSalesCount currentRank").lean(),
      // H-06 fix: limit downline fetch to prevent memory issues on large networks
      User.find({ "generationAncestors.userId": userId })
        .select("_id username name generationAncestors")
        .limit(500)
        .lean(),
      Settings.findOne().lean(),
      Project.find({ isActive: true }).lean(),
      Event.find({ isActive: true }).sort({ createdAt: -1 }).limit(3).lean(),
    ]);

    const allRanks = [...((settings as any)?.ranks ?? [])].sort(
      (a: any, b: any) => (a.minNetworkSalesAmount ?? 0) - (b.minNetworkSalesAmount ?? 0)
    );
    const directSalesCount = (user as any)?.directSalesCount ?? 0;
    const teamSalesCount = (user as any)?.teamSalesCount ?? 0;
    const currentRankName = (user as any)?.currentRank ?? null;
    const currentRank = allRanks.find((r: any) => r.name === currentRankName) ?? null;
    const currentRequired = (currentRank as any)?.minNetworkSalesAmount ?? 0;
    const nextRank = allRanks.find((r: any) => (r.minNetworkSalesAmount ?? 0) > currentRequired) ?? null;

    res.json({
      wallet,
      purchases,
      shares,
      events,
      investmentConfig: (settings as any)?.investmentConfig ?? null,
      network: { tree: buildTree(downlineNodes, userId.toString()) },
      rank: { currentRank, nextRank, directSalesCount, teamSalesCount },
    });
  } catch (err) { next(err); }
};
