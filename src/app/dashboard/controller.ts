import { Request, Response, NextFunction } from "express";
import { Wallet } from "../wallet/model";
import { Purchase } from "../purchase/model";
import { Settings } from "../settings/model";
import { User } from "../user/model";
import { Share } from "../share/model";
import { Event } from "../event/model";

const buildTree = (nodes: any[], parentId: string): any[] =>
  nodes
    .filter((n) => n.generationAncestors?.[0]?.userId?.toString() === parentId)
    .map((n) => ({
      _id: n._id.toString(),
      username: n.username,
      name: n.name,
      children: buildTree(nodes, n._id.toString()),
    }));

// GET /dashboard/user
export const getUserDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!._id;

    const [wallet, purchases, user, downlineNodes, settings, shares, events] = await Promise.all([
      Wallet.findOne({ userId }).lean(),
      Purchase.find({ userId }).populate("shareId", "title cashPrice installment image").sort({ createdAt: -1 }).lean(),
      User.findById(userId).select("directSalesCount teamSalesCount currentRank").lean(),
      User.find({ "generationAncestors.userId": userId }).select("_id username name generationAncestors").lean(),
      Settings.findOne().lean(),
      Share.find({ isActive: true }).lean(),
      Event.find({ isActive: true }).sort({ createdAt: -1 }).limit(3).lean(),
    ]);

    const allRanks = ((settings as any)?.ranks ?? []).sort((a: any, b: any) => a.order - b.order);
    const directSalesCount = (user as any)?.directSalesCount ?? 0;
    const teamSalesCount = (user as any)?.teamSalesCount ?? 0;
    const currentRankName = (user as any)?.currentRank ?? null;
    const currentRank = allRanks.find((r: any) => r.name === currentRankName) ?? null;
    const nextRank = allRanks.find((r: any) => r.order > ((currentRank as any)?.order ?? -1)) ?? null;

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
