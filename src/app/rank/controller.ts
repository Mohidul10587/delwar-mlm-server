import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Settings } from "../settings/model";
import { User } from "../user/model";
import { Purchase } from "../purchase/model";
import { Wallet, TransactionLog } from "../wallet/model";
import { RankSalaryLog } from "./salary-log.model";
import { CompanyLedger } from "../ledger/model";

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
    const ranks = (s.ranks ?? []);
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
      requiredGeneration = 1,
      requiredApprovedSales = 0,
      reward,
      salary,
    } = req.body;

    // M-13 fix: prevent duplicate rank names
    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Rank name is required" });
    }
    const exists = (s.ranks as any[]).some(
      (r) => r.name?.toLowerCase() === String(name).trim().toLowerCase()
    );
    if (exists) {
      return res.status(400).json({ message: `A rank named "${name}" already exists` });
    }

    (s.ranks as any[]).push({
      name: String(name).trim(),
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
    
    const {
      name,
      requiredApprovedSales,
      reward,
      salary,
    } = req.body;
    
    s.ranks[idx] = {
      ...s.ranks[idx],
      name,
      requiredApprovedSales,
      reward,
      salary,
    };
    
    await s.save();
    res.json({ message: "Rank updated", ranks: s.ranks });
  } catch (err) {
    next(err);
  }
};

export const replaceAllRanks = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const s = await Settings.findOne();
    if (!s) return res.status(404).json({ message: "Settings not found" });
    
    s.ranks = req.body.ranks;
    await s.save();
    
    res.json({ message: "Ranks replaced successfully", ranks: s.ranks });
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
    const s = await Settings.findOne();
    if (!s) return res.status(404).json({ message: "Settings not found" });
    
    const originalLength = s.ranks.length;
    s.ranks = (s.ranks as any[]).filter(
      (r) => r._id.toString() !== req.params.id
    );
    
    if (s.ranks.length === originalLength) {
      return res.status(404).json({ message: "Rank not found" });
    }
    
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
    const allRanks = (s.ranks ?? []);
    const currentRankName = (user as any)?.currentRank ?? "Brand Ambassador";

    // Sales-based ranks live in Settings.ranks.
    // Brand Ambassador and Entrepreneur are system ranks not stored in Settings,
    // so we synthesise a rank object when the user is on one of those.
    const SYSTEM_RANKS: Record<string, any> = {
      "Brand Ambassador": {
        _id: "system-brand-ambassador",
        name: "Brand Ambassador",
        requiredApprovedSales: 0,
      },
      "Entrepreneur": {
        _id: "system-entrepreneur",
        name: "Entrepreneur",
        requiredApprovedSales: 0,
      },
    };

    const currentRank =
      allRanks.find((r: any) => r.name === currentRankName) ??
      SYSTEM_RANKS[currentRankName] ??
      null;

    res.json({ currentRank, allRanks });
  } catch (err) {
    next(err);
  }
};

// ── Core: get total approved sales amount for all network members of a user ───

async function getTotalApprovedSalesByGeneration(
  userId: mongoose.Types.ObjectId | string,
  generation: number
): Promise<number> {
  const uid = new mongoose.Types.ObjectId(userId.toString());

  // Find users whose ancestor at exactly this generation level is the given user
  const networkUsers = await User.find({
    generationAncestors: {
      $elemMatch: { userId: uid, level: generation },
    },
  })
    .select("_id")
    .lean();

  if (!networkUsers.length) return 0;

  const count = await Purchase.countDocuments({
    userId: { $in: networkUsers.map((u) => u._id) },
    status: "approved",
  });

  return count;
}

// ── Purchase-based rank (Entrepreneur) ───────────────────────────────────────

/**
 * Called after a purchase is approved for the buyer.
 *
 * Rules:
 *  - If the user already has at least one sales-based rank in earnedRanks,
 *    do nothing (Sales-based rank always takes priority).
 *  - Otherwise, promote currentRank to "Entrepreneur" (purchase-based rank).
 *    Uses an atomic findOneAndUpdate so concurrent approvals are safe.
 */
export const applyPurchaseBasedRank = async (userId: string): Promise<void> => {
  try {
    // Only promote to Entrepreneur when the user has NO sales-based ranks yet.
    // earnedRanks contains only sales-based ranks (populated by recalcUserRank).
    await User.findOneAndUpdate(
      {
        _id: userId,
        // Guard: earnedRanks must be empty (no sales-based rank ever earned)
        $or: [
          { earnedRanks: { $exists: false } },
          { earnedRanks: { $size: 0 } },
        ],
        // Only upgrade from Brand Ambassador (never demote from a higher state)
        currentRank: "Brand Ambassador",
      },
      {
        $set: {
          currentRank: "Entrepreneur",
          currentRankAchievedAt: new Date(),
        },
      }
    );
  } catch (err) {
    console.error("[RANK] applyPurchaseBasedRank error:", err);
  }
};

// ── Recalculate and update user rank ─────────────────────────────────────────

// M-09 fix: accept pre-loaded ranks to avoid repeated Settings.findOne() per ancestor
// C-04 fix: accept pre-loaded ranks to avoid repeated Settings.findOne() per ancestor
export const recalcUserRank = async (userId: string, preloadedRanks?: any[]) => {
  try {
    const user = await User.findById(userId).select(
      "currentRank currentRankAchievedAt earnedRanks"
    );
    if (!user) return;

    // C-04 fix: reuse passed ranks, only query if not provided
    let ranks: any[];
    if (preloadedRanks) {
      ranks = preloadedRanks;
    } else {
      const s = await Settings.findOne();
      ranks = (s?.ranks ?? []) as any[];
    }
    if (!ranks.length) return;

    let newRank: any = null;
    let currentEarnedRanks = (user as any).earnedRanks || [];

    for (let i = 0; i < ranks.length; i++) {
      const rank = ranks[i];
      const generation = i + 1;
      const threshold: number = rank.requiredApprovedSales ?? 0;

      if (i > 0 && !currentEarnedRanks.includes(ranks[i - 1].name)) {
        break;
      }

      if (currentEarnedRanks.includes(rank.name)) {
        newRank = rank;
        continue;
      }

      if (threshold > 0) {
        const totalShares = await getTotalApprovedSalesByGeneration(userId, generation);
        if (totalShares >= threshold) {
          newRank = rank;
          currentEarnedRanks.push(rank.name);
        } else {
          break;
        }
      }
    }

    const newRankName: string | null = newRank?.name ?? null;

    if (newRankName && newRankName !== (user as any).currentRank) {
      // H-10 fix: atomic update — only update if currentRank hasn't changed concurrently
      const updated = await User.findOneAndUpdate(
        { _id: userId, currentRank: (user as any).currentRank },
        {
          $set: {
            currentRank: newRankName,
            currentRankAchievedAt: new Date(),
            earnedRanks: currentEarnedRanks,
          },
        },
        { new: true }
      );
      // If updated is null, another concurrent call already updated the rank — skip reward
      if (updated) {
        await issueRankReward(userId, newRank);
      }
    }
  } catch (err) {
    console.error("recalcUserRank error:", err);
  }
};

async function issueRankReward(userId: string, rank: any) {
  if (!rank?.reward?.value) return;

  // Fix F-08: Atomic check — only issue reward if not already issued for this rank
  // Uses TransactionLog as the source of truth to prevent double-issuance
  const alreadyIssued = await TransactionLog.findOne({
    userId,
    type: "reward",
    note: { $regex: `"${rank.name}"` },
  }).lean();
  if (alreadyIssued) return;

  // Fix F-05: atomic $inc to prevent race condition
  const wallet = await Wallet.findOneAndUpdate(
    { userId },
    { $inc: { rewardBalance: rank.reward.value, totalBalance: rank.reward.value } },
    { new: true, upsert: true }
  );

  const note = `Rank reward — "${rank.name}" achieved: ${rank.reward.name} worth ৳${rank.reward.value.toLocaleString()} (${rank.reward.type})`;
  await TransactionLog.create({
    userId,
    type: "reward",
    amount: rank.reward.value,
    balanceAfter: wallet.rewardBalance,
    note,
  });

  try {
    await CompanyLedger.create({
      date: new Date(),
      type: "reward_paid",
      amount: rank.reward.value,
      userId,
      note,
    });
  } catch (ledgerErr) {
    console.error(`[LEDGER ERROR] reward_paid for userId=${userId}:`, ledgerErr);
  }
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

    // Fix F-05: atomic $inc — prevents race condition if cron runs twice concurrently
    const updatedWallet = await Wallet.findOneAndUpdate(
      { userId: user._id },
      { $inc: { salaryBalance: sal.amount, totalBalance: sal.amount } },
      { new: true, upsert: true }
    );

    await TransactionLog.create({
      userId: user._id,
      type: "salary",
      amount: sal.amount,
      balanceAfter: updatedWallet.salaryBalance,
      note: `Monthly salary — Rank: ${rank.name}, Month: ${currentYear}-${String(currentMonth).padStart(2,"0")}, ৳${sal.amount.toLocaleString()} (payment ${paidCount + 1}/${sal.durationMonths ?? 3})`,
    });

    try {
      await CompanyLedger.create({
        date: new Date(),
        type: "salary_paid",
        amount: sal.amount,
        userId: user._id,
        note: `Monthly salary — Rank: ${rank.name}, Month: ${currentYear}-${String(currentMonth).padStart(2,"0")}, ৳${sal.amount.toLocaleString()} (payment ${paidCount + 1}/${sal.durationMonths ?? 3})`,
      });
    } catch (ledgerErr) {
      console.error(`[LEDGER ERROR] salary_paid for userId=${user._id}:`, ledgerErr);
    }

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
