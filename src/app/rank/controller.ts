import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Settings } from "../settings/model";
import { User } from "../user/model";
import { Purchase } from "../purchase/model";
import { Wallet, TransactionLog } from "../wallet/model";
import { RankSalaryLog } from "./salary-log.model";

const getSettings = async () => {
  let s = await Settings.findOne();
  if (!s) s = await Settings.create({});
  return s;
};

// ── Rank CRUD (stored in Settings) ───────────────────────────────────────────

export const getRanks = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const s = await getSettings();
    const ranks = (s.ranks ?? []).sort((a: any, b: any) => a.order - b.order);
    res.json({ ranks });
  } catch (err) {
    next(err);
  }
};

export const createRank = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const s = await getSettings();
    const {
      name,
      order = 0,
      requiredGeneration = 1,
      requiredApprovedSales = 0,
      reward,
      salary,
    } = req.body;
    (s.ranks as any[]).push({
      name,
      order,
      requiredGeneration,
      requiredApprovedSales,
      reward,
      salary,
    });
    s.markModified("ranks");
    await s.save();
    res.status(201).json({ message: "Rank created", ranks: s.ranks });
  } catch (err) {
    next(err);
  }
};

export const updateRank = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const s = await getSettings();
    const idx = (s.ranks as any[]).findIndex(
      (r) => r._id.toString() === req.params.id
    );
    if (idx === -1) return res.status(404).json({ message: "Rank not found" });
    const rank = s.ranks[idx] as any;
    const {
      name,
      order,
      requiredGeneration,
      requiredApprovedSales,
      reward,
      salary,
    } = req.body;
    rank.set({
      name,
      order,
      requiredGeneration,
      requiredApprovedSales,
      reward,
      salary,
    });
    s.markModified("ranks");
    await s.save();
    res.json({ message: "Rank updated", ranks: s.ranks });
  } catch (err) {
    next(err);
  }
};

export const deleteRank = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const s = await getSettings();
    (s as any).ranks = (s.ranks as any[]).filter(
      (r) => r._id.toString() !== req.params.id
    );
    await s.save();
    res.json({ message: "Rank deleted" });
  } catch (err) {
    next(err);
  }
};

// ── User rank info ────────────────────────────────────────────────────────────

export const getMyRank = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await User.findById(req.user!._id)
      .select("currentRank currentRankAchievedAt earnedRanks")
      .lean();
    const s = await getSettings();
    const allRanks = (s.ranks ?? []).sort(
      (a: any, b: any) => a.order - b.order
    );
    const currentRankName = (user as any)?.currentRank ?? null;
    const currentRank =
      allRanks.find((r: any) => r.name === currentRankName) ?? null;
    const nextRank =
      allRanks.find((r: any) => r.order > (currentRank?.order ?? -1)) ?? null;
    res.json({ currentRank, nextRank, allRanks });
  } catch (err) {
    next(err);
  }
};

// ── Core: get total approved sales amount for all network members of a user ───

async function getTotalApprovedSales(
  userId: mongoose.Types.ObjectId | string
): Promise<number> {
  const uid = new mongoose.Types.ObjectId(userId.toString());

  const networkUsers = await User.find({
    "generationAncestors.userId": uid,
  })
    .select("_id")
    .lean();

  if (!networkUsers.length) return 0;

  const result = await Purchase.aggregate([
    {
      $match: {
        userId: { $in: networkUsers.map((u) => u._id) },
        status: "approved",
      },
    },
    { $group: { _id: null, total: { $sum: "$amountPaid" } } },
  ]);

  return result[0]?.total ?? 0;
}

// ── Recalculate and update user rank ─────────────────────────────────────────

export const recalcUserRank = async (userId: string) => {
  try {
    const user = await User.findById(userId).select(
      "currentRank currentRankAchievedAt earnedRanks"
    );
    if (!user) return;

    const s = await Settings.findOne();
    const ranks = ((s?.ranks ?? []) as any[]).sort(
      (a: any, b: any) => a.order - b.order
    );
    if (!ranks.length) return;

    const total = await getTotalApprovedSales(userId);

    let newRank: any = null;
    for (const rank of ranks) {
      const threshold: number = rank.requiredApprovedSales ?? 0;
      if (threshold > 0 && total >= threshold) {
        newRank = rank;
      }
    }

    const newRankName: string | null = newRank?.name ?? null;

    if (newRankName && newRankName !== (user as any).currentRank) {
      await User.findByIdAndUpdate(userId, {
        currentRank: newRankName,
        currentRankAchievedAt: new Date(),
        $addToSet: { earnedRanks: newRankName },
      });

      await issueRankReward(userId, newRank);
    }
  } catch (err) {
    console.error("recalcUserRank error:", err);
  }
};

async function issueRankReward(userId: string, rank: any) {
  if (!rank?.reward?.value) return;
  const wallet = await Wallet.findOne({ userId });
  if (!wallet) return;

  wallet.rewardBalance += rank.reward.value;
  await wallet.save();

  await TransactionLog.create({
    userId,
    type: "reward",
    amount: rank.reward.value,
    balanceAfter: wallet.rewardBalance,
    note: `Rank reward: ${rank.name} — ${rank.reward.name} (${rank.reward.type})`,
  });
}

// ── Monthly salary release ────────────────────────────────────────────────────

export const releaseMonthlySalaries = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const released = await processMonthlySalaries();
    res.json({ message: `Salary released for ${released} users` });
  } catch (err) {
    next(err);
  }
};

export const processMonthlySalaries = async (): Promise<number> => {
  const s = await Settings.findOne();
  const ranks = ((s?.ranks ?? []) as any[]).filter(
    (r: any) => r.salary?.amount > 0
  );
  if (!ranks.length) return 0;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1–12

  // Month boundaries for current-month purchase checks
  const monthStart = new Date(currentYear, currentMonth - 1, 1);
  const monthEnd = new Date(currentYear, currentMonth, 1);

  let count = 0;

  const users = await User.find({
    currentRank: { $in: ranks.map((r: any) => r.name) },
  }).select("_id currentRank currentRankAchievedAt");

  for (const user of users) {
    const rank = ranks.find((r: any) => r.name === (user as any).currentRank);
    if (!rank) continue;

    const sal = rank.salary;
    const achievedAt: Date = (user as any).currentRankAchievedAt ?? new Date(0);

    // Salary starts from the month AFTER rank achievement
    const salaryStartMonth = new Date(achievedAt);
    salaryStartMonth.setMonth(salaryStartMonth.getMonth() + 1);
    salaryStartMonth.setDate(1);
    salaryStartMonth.setHours(0, 0, 0, 0);

    if (now < salaryStartMonth) continue;

    // Check duration: how many salary months have been paid for this rank
    const paidCount = await RankSalaryLog.countDocuments({
      userId: user._id,
      rankName: rank.name,
    });
    const maxDuration: number = sal.durationMonths ?? 3;
    if (paidCount >= maxDuration) continue;

    // Dedup: already paid this month for this rank?
    const alreadyPaid = await RankSalaryLog.findOne({
      userId: user._id,
      rankName: rank.name,
      year: currentYear,
      month: currentMonth,
    });
    if (alreadyPaid) continue;

    // ── Condition 1: current-month direct sales (approved purchases where seller's
    //    gen-ancestor[0] is this user, approved this month) ────────────────────
    const monthlySalesResult = await Purchase.aggregate([
      {
        $match: {
          status: "approved",
          reviewedAt: { $gte: monthStart, $lt: monthEnd },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "buyer",
        },
      },
      { $unwind: "$buyer" },
      {
        $match: {
          "buyer.generationAncestors": {
            $elemMatch: {
              level: 1,
              userId: user._id,
            },
          },
        },
      },
      {
        $group: { _id: null, count: { $sum: "$quantity" } },
      },
    ]);
    const monthlySalesCount: number = monthlySalesResult[0]?.count ?? 0;
    if (monthlySalesCount < (sal.minMonthlySales ?? 0)) continue;

    // All conditions met — issue salary
    const wallet = await Wallet.findOne({ userId: user._id });
    if (!wallet) continue;

    wallet.salaryBalance += sal.amount;
    await wallet.save();

    await TransactionLog.create({
      userId: user._id,
      type: "salary",
      amount: sal.amount,
      balanceAfter: wallet.salaryBalance,
      note: `Monthly salary — Rank: ${rank.name} (${currentYear}-${currentMonth})`,
    });

    await RankSalaryLog.create({
      userId: user._id,
      rankName: rank.name,
      year: currentYear,
      month: currentMonth,
    });

    count++;
  }

  return count;
};
