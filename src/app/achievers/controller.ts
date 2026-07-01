import { Request, Response, NextFunction } from "express";
import { Settings } from "../settings/model";
import { User } from "../user/model";

const VISIBLE_LIMIT = 8;

export interface AchieverMember {
  id: string;
  name: string;
  username: string;
  image: string | null;
  achievedAt: Date | null;
}

export interface AchieversRankGroup {
  rank: string;
  totalMembers: number;
  visibleMembers: AchieverMember[];
  remaining: number;
}

export const getAchievers = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Single Settings read
    const settings = await Settings.findOne().select("ranks").lean();
    const ranks: { name: string }[] = settings?.ranks ?? [];

    if (!ranks.length) {
      return res.json([]);
    }

    // Single optimized User query — only needed fields, only users with a currentRank
    const rankNames = ranks.map((r) => r.name);

    const users = await User.find({
      currentRank: { $in: rankNames },
    })
      .select("_id name username image currentRank currentRankAchievedAt")
      .lean();

    // Group users by rank in memory (avoids N+1 queries)
    const byRank = new Map<string, AchieverMember[]>();
    for (const user of users) {
      const rankName = user.currentRank as string;
      if (!byRank.has(rankName)) {
        byRank.set(rankName, []);
      }
      byRank.get(rankName)!.push({
        id: user._id.toString(),
        name: user.name,
        username: user.username,
        image: user.image ?? null,
        achievedAt: user.currentRankAchievedAt ?? null,
      });
    }

    // Sort each group: ascending by achievedAt (nulls last)
    for (const members of byRank.values()) {
      members.sort((a, b) => {
        if (!a.achievedAt && !b.achievedAt) return 0;
        if (!a.achievedAt) return 1;
        if (!b.achievedAt) return -1;
        return a.achievedAt.getTime() - b.achievedAt.getTime();
      });
    }

    // Build response following Settings.ranks order, hide empty ranks
    const result: AchieversRankGroup[] = [];

    for (const rank of ranks) {
      const members = byRank.get(rank.name) ?? [];
      if (!members.length) continue; // hide empty rank sections

      const visibleMembers = members.slice(0, VISIBLE_LIMIT);
      const totalMembers = members.length;
      const remaining = totalMembers - visibleMembers.length;

      result.push({
        rank: rank.name,
        totalMembers,
        visibleMembers,
        remaining,
      });
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
};
