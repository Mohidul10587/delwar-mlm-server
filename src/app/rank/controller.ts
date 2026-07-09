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
      minNetworkSalesAmount = 0,
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
      minNetworkSalesAmount,
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

    // First 2 ranks are locked and cannot be updated
    if (idx < 2) return res.status(403).json({ message: "This rank is locked and cannot be edited" });

    const {
      name,
      minNetworkSalesAmount,
      reward,
      salary,
    } = req.body;
    
    s.ranks[idx] = {
      ...s.ranks[idx],
      name,
      minNetworkSalesAmount,
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

    // First 2 ranks are locked — always preserved from DB, never replaced by payload
    const lockedRanks = (s.ranks as any[]).slice(0, 2);
    const editableRanks = (req.body.ranks ?? []).slice(2);

    s.ranks = [...lockedRanks, ...editableRanks];
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

    // First 2 ranks are locked and cannot be deleted
    const rankIdx = (s.ranks as any[]).findIndex(
      (r) => r._id.toString() === req.params.id
    );
    if (rankIdx === -1) return res.status(404).json({ message: "Rank not found" });
    if (rankIdx < 2) return res.status(403).json({ message: "This rank is locked and cannot be deleted" });

    s.ranks = (s.ranks as any[]).filter(
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
      .select("currentRank currentRankAchievedAt earnedRanks directSalesCount teamSalesCount")
      .lean();
    const s = await getSettings();
    // Keep original Settings order — order defines rank progression
    const allRanks = [...(s.ranks ?? [])] as any[];

    const currentRankName = (user as any)?.currentRank ?? null;

    // currentRank is always looked up from Settings.ranks — no hardcoded system ranks
    const currentRank =
      allRanks.find((r: any) => r.name === currentRankName) ?? null;

    // Next rank = the rank that comes immediately after currentRank in Settings order.
    // Special case for Rank 2 (index 1): if user is already at Rank 3+ (index >= 2),
    // next rank is the one after currentRank, skipping Rank 2 if already bypassed.
    const currentIndex = currentRank
      ? allRanks.findIndex((r: any) => r.name === currentRankName)
      : -1;

    let nextRank: any = null;
    if (currentIndex === -1) {
      // No rank yet — next is Rank 1
      nextRank = allRanks[0] ?? null;
    } else if (currentIndex === 0) {
      // At Rank 1 — next is Rank 2
      nextRank = allRanks[1] ?? null;
    } else if (currentIndex >= 2) {
      // At Rank 3+ — next is simply the rank after current in Settings order
      nextRank = allRanks[currentIndex + 1] ?? null;
    } else {
      // At Rank 2 — next is Rank 3
      nextRank = allRanks[2] ?? null;
    }

    const directSalesCount = (user as any)?.directSalesCount ?? 0;
    const teamSalesCount = (user as any)?.teamSalesCount ?? 0;

    res.json({ currentRank, nextRank, allRanks, directSalesCount, teamSalesCount });
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

// ── Recalculate and update user rank ─────────────────────────────────────────

// M-09 fix: accept pre-loaded ranks to avoid repeated Settings.findOne() per ancestor
// C-04 fix: accept pre-loaded ranks to avoid repeated Settings.findOne() per ancestor
export const recalcUserRank = async (userId: string, preloadedRanks?: any[]) => {
  try {
    const user = await User.findById(userId).select(
      "currentRank currentRankAchievedAt earnedRanks personalPurchaseCount"
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
    let currentEarnedRanks: string[] = (user as any).earnedRanks || [];
    const personalPurchaseCount: number = (user as any).personalPurchaseCount ?? 0;

    /**
     * Rank promotion rules:
     *
     * Index 0 (Rank 1) — assigned at registration; recalc treats it as always earned.
     *
     * Index 1 (Rank 2) — only condition is minPersonalPurchaseQtyToAchieve (one-time
     *   lifetime personal purchase count). Network sales are NOT checked.
     *   Sequential gate: must hold Rank 1 (already guaranteed by registration logic).
     *   IMPORTANT: if user is already at Rank 3+, Rank 2 is skipped silently — we
     *   never downgrade.
     *
     * Index 2+ (Rank 3 and above) — checked only for network sales threshold.
     *   Sequential gate applies ONLY among ranks at index 2+ (i.e. must hold the
     *   previous rank at index >= 2). Rank 2 NOT required — a user can jump from
     *   Rank 1 directly to Rank 3 if network sales conditions are met.
     */

    for (let i = 0; i < ranks.length; i++) {
      const rank = ranks[i];

      // ── Already earned this rank — mark and continue ──────────────────────
      if (currentEarnedRanks.includes(rank.name)) {
        newRank = rank;
        continue;
      }

      // ── Rank 1 (index 0): always already earned (assigned at registration) ─
      // recalcUserRank is never responsible for awarding Rank 1.
      if (i === 0) {
        // Rank 1 should already be in earnedRanks (set at registration).
        // If somehow it's missing, add it defensively but don't issue reward.
        currentEarnedRanks.push(rank.name);
        newRank = rank;
        continue;
      }

      // ── Rank 2 (index 1): personal purchase only ──────────────────────────
      if (i === 1) {
        const minPersonalQty: number = rank.minPersonalPurchaseQtyToAchieve ?? 0;
        if (minPersonalQty > 0 && personalPurchaseCount < minPersonalQty) {
          // Rank 2 condition not met — but do NOT break; Rank 3+ can still be checked
          continue;
        }
        // Condition met — award Rank 2 only if user doesn't already hold a higher rank
        const currentRankIndex = ranks.findIndex(
          (r: any) => r.name === (user as any).currentRank
        );
        if (currentRankIndex > 1) {
          // Already at Rank 3+ — skip Rank 2 silently, add to earnedRanks for bookkeeping
          currentEarnedRanks.push(rank.name);
          continue;
        }
        newRank = rank;
        currentEarnedRanks.push(rank.name);
        continue;
      }

      // ── Rank 3+ (index >= 2): network sales, sequential among index 2+ ────
      // Sequential gate: the previous rank at index >= 2 must have been earned.
      // Rank 2 (index 1) is deliberately excluded from this gate.
      if (i >= 3) {
        // Must hold the rank at index i-1 (which is also index >= 2)
        if (!currentEarnedRanks.includes(ranks[i - 1].name)) {
          break;
        }
      } else {
        // i === 2 (Rank 3): must hold Rank 1 (index 0). Rank 2 NOT required.
        if (!currentEarnedRanks.includes(ranks[0].name)) {
          break;
        }
      }

      // Check personal purchase requirement if configured on this rank
      const minPersonalQty: number = rank.minPersonalPurchaseQtyToAchieve ?? 0;
      if (minPersonalQty > 0 && personalPurchaseCount < minPersonalQty) {
        break;
      }

      // Check network sales threshold
      const threshold: number = rank.minNetworkSalesAmount ?? 0;
      if (threshold > 0) {
        // Generation mapping: Rank 3 (index 2) → gen 1, Rank 4 (index 3) → gen 2, etc.
        const generation = i - 1;
        const totalSales = await getTotalApprovedSalesByGeneration(userId, generation);
        if (totalSales >= threshold) {
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
  if (!rank?.reward) return;

  // Fix F-08: Atomic check — only issue reward if not already issued for this rank
  // Uses TransactionLog as the source of truth to prevent double-issuance
  const alreadyIssued = await TransactionLog.findOne({
    userId,
    type: "reward",
    note: { $regex: `"${rank.name}"` },
  }).lean();
  if (alreadyIssued) return;

  // reward is a physical/named item — no monetary value, so wallet is not touched
  const note = `Rank reward — "${rank.name}" achieved: ${rank.reward}`;
  await TransactionLog.create({
    userId,
    type: "reward",
    amount: 0,
    balanceAfter: 0,
    note,
  });

  try {
    await CompanyLedger.create({
      date: new Date(),
      type: "reward_paid",
      amount: 0,
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

  // Month boundaries for current-month direct-sales check
  const monthStart = new Date(currentYear, currentMonth - 1, 1);
  const monthEnd = new Date(currentYear, currentMonth, 1);

  let count = 0;

  const users = await User.find({
    currentRank: { $in: ranks.map((r: any) => r.name) },
  }).select("_id currentRank currentRankAchievedAt personalPurchaseCount");

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
    const maxDuration: number = sal.salaryDurationMonths ?? 3;
    if (paidCount >= maxDuration) continue;

    // Dedup: already paid this month for this rank?
    const alreadyPaid = await RankSalaryLog.findOne({
      userId: user._id,
      rankName: rank.name,
      year: currentYear,
      month: currentMonth,
    });
    if (alreadyPaid) continue;

    // ── Condition 1: current-month direct sales ──────────────────────────────
    // Count approved purchases this month where the buyer's gen-1 ancestor is this user.
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
    if (monthlySalesCount < (sal.minMonthlySalesQty ?? 0)) continue;

    // ── Condition 2: cumulative personal purchase count ──────────────────────
    // The user must have accumulated at least minTotalPersonalPurchaseQtyForSalary
    // total (all-time) approved personal purchases to receive salary this month.
    const minTotalPersonalQty: number =
      sal.minTotalPersonalPurchaseQtyForSalary ?? 0;
    if (minTotalPersonalQty > 0) {
      const userPersonalCount: number =
        (user as any).personalPurchaseCount ?? 0;
      if (userPersonalCount < minTotalPersonalQty) continue;
    }

    // Fix F-05: atomic $inc — prevents race condition if cron runs twice concurrently
    const updatedWallet = await Wallet.findOneAndUpdate(
      { userId: user._id },
      { $inc: { salaryBalanceFromRanks: sal.amount, totalBalance: sal.amount } },
      { new: true, upsert: true }
    );

    await TransactionLog.create({
      userId: user._id,
      type: "salary",
      amount: sal.amount,
      balanceAfter: updatedWallet.salaryBalanceFromRanks,
      note: `Monthly salary — Rank: ${rank.name}, Month: ${currentYear}-${String(currentMonth).padStart(2, "0")}, ৳${sal.amount.toLocaleString()} (payment ${paidCount + 1}/${sal.salaryDurationMonths ?? 3})`,
    });

    try {
      await CompanyLedger.create({
        date: new Date(),
        type: "salary_paid",
        amount: sal.amount,
        userId: user._id,
        note: `Monthly salary — Rank: ${rank.name}, Month: ${currentYear}-${String(currentMonth).padStart(2, "0")}, ৳${sal.amount.toLocaleString()} (payment ${paidCount + 1}/${sal.salaryDurationMonths ?? 3})`,
      });
    } catch (ledgerErr) {
      console.error(
        `[LEDGER ERROR] salary_paid for userId=${user._id}:`,
        ledgerErr
      );
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

// ── GET /rank/salary-eligible ─────────────────────────────────────────────────
// Returns all users whose currentRank has salary.amount > 0, with per-user
// breakdown: rank info, this month's sales count, how many more needed,
// cumulative personal purchase count, and whether they qualify this month.

export const getSalaryEligibleUsers = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const s = await Settings.findOne();
    const salaryRanks = ((s?.ranks ?? []) as any[]).filter(
      (r: any) => r.salary?.amount > 0
    );
    if (!salaryRanks.length) {
      return res.json({ users: [] });
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1–12
    const monthStart = new Date(currentYear, currentMonth - 1, 1);
    const monthEnd = new Date(currentYear, currentMonth, 1);

    // Fetch all users currently holding a salary-eligible rank
    const users = await User.find({
      currentRank: { $in: salaryRanks.map((r: any) => r.name) },
    })
      .select(
        "_id name username phone currentRank currentRankAchievedAt personalPurchaseCount"
      )
      .lean();

    // For each user, count this month's direct sales and check all conditions
    const rows = await Promise.all(
      users.map(async (user) => {
        const rank = salaryRanks.find(
          (r: any) => r.name === (user as any).currentRank
        );
        if (!rank) return null;

        const sal = rank.salary;
        const achievedAt: Date =
          (user as any).currentRankAchievedAt ?? new Date(0);

        // Salary start month = month after rank achievement
        const salaryStartMonth = new Date(achievedAt);
        salaryStartMonth.setMonth(salaryStartMonth.getMonth() + 1);
        salaryStartMonth.setDate(1);
        salaryStartMonth.setHours(0, 0, 0, 0);
        const salaryStarted = now >= salaryStartMonth;

        // How many salary months have been paid
        const paidCount = await RankSalaryLog.countDocuments({
          userId: user._id,
          rankName: rank.name,
        });
        const maxDuration: number = sal.salaryDurationMonths ?? 3;
        const durationExceeded = paidCount >= maxDuration;

        // Already paid this month?
        const alreadyPaidThisMonth = !!(await RankSalaryLog.findOne({
          userId: user._id,
          rankName: rank.name,
          year: currentYear,
          month: currentMonth,
        }).lean());

        // This month's direct sales
        const salesAgg = await Purchase.aggregate([
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
                $elemMatch: { level: 1, userId: user._id },
              },
            },
          },
          { $group: { _id: null, count: { $sum: "$quantity" } } },
        ]);
        const monthlySalesCount: number = salesAgg[0]?.count ?? 0;
        const minMonthlySalesQty: number = sal.minMonthlySalesQty ?? 0;
        const salesNeeded = Math.max(0, minMonthlySalesQty - monthlySalesCount);
        // salesConditionMet is only meaningful if salary has already started
        const salesConditionMet =
          salaryStarted &&
          (minMonthlySalesQty === 0 || monthlySalesCount >= minMonthlySalesQty);

        // Cumulative personal purchase condition
        const minTotalPersonalQty: number =
          sal.minTotalPersonalPurchaseQtyForSalary ?? 0;
        const personalPurchaseCount: number =
          (user as any).personalPurchaseCount ?? 0;
        const personalPurchaseNeeded = Math.max(
          0,
          minTotalPersonalQty - personalPurchaseCount
        );
        const personalConditionMet =
          minTotalPersonalQty === 0 ||
          personalPurchaseCount >= minTotalPersonalQty;

        // Overall eligibility for this month
        const eligibleThisMonth =
          salaryStarted &&
          !durationExceeded &&
          !alreadyPaidThisMonth &&
          salesConditionMet &&
          personalConditionMet;

        return {
          userId: user._id,
          name: (user as any).name,
          username: (user as any).username,
          phone: (user as any).phone,
          currentRank: (user as any).currentRank,
          rankAchievedAt: (user as any).currentRankAchievedAt,
          // Salary config
          salaryAmount: sal.amount,
          salaryDurationMonths: maxDuration,
          paidCount,
          remainingPayments: Math.max(0, maxDuration - paidCount),
          // Monthly sales
          minMonthlySalesQty,
          monthlySalesCount,
          salesNeeded,
          salesConditionMet,
          // Personal purchase (cumulative)
          minTotalPersonalPurchaseQty: minTotalPersonalQty,
          personalPurchaseCount,
          personalPurchaseNeeded,
          personalConditionMet,
          // Status flags
          salaryStarted,
          durationExceeded,
          alreadyPaidThisMonth,
          eligibleThisMonth,
        };
      })
    );

    const result = rows.filter(Boolean);

    res.json({
      year: currentYear,
      month: currentMonth,
      users: result,
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /rank/release-salary/:userId ─────────────────────────────────────────
// Super-admin manually releases this month's rank salary for one specific user.
// Runs the same eligibility checks as the cron — no double-payment possible.

export const releaseRankSalaryForUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid userId" });
    }

    const s = await Settings.findOne();
    const ranks = ((s?.ranks ?? []) as any[]).filter(
      (r: any) => r.salary?.amount > 0
    );

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const monthStart = new Date(currentYear, currentMonth - 1, 1);
    const monthEnd = new Date(currentYear, currentMonth, 1);

    const user = await User.findById(userId).select(
      "_id currentRank currentRankAchievedAt personalPurchaseCount"
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    const rank = ranks.find((r: any) => r.name === (user as any).currentRank);
    if (!rank) {
      return res
        .status(400)
        .json({ message: "User's current rank has no salary configured" });
    }

    const sal = rank.salary;
    const achievedAt: Date =
      (user as any).currentRankAchievedAt ?? new Date(0);

    // Must be in a month after rank achievement
    const salaryStartMonth = new Date(achievedAt);
    salaryStartMonth.setMonth(salaryStartMonth.getMonth() + 1);
    salaryStartMonth.setDate(1);
    salaryStartMonth.setHours(0, 0, 0, 0);
    if (now < salaryStartMonth) {
      return res.status(400).json({
        message: "Salary only starts from the month after rank achievement",
      });
    }

    // Duration check
    const paidCount = await RankSalaryLog.countDocuments({
      userId: user._id,
      rankName: rank.name,
    });
    const maxDuration: number = sal.salaryDurationMonths ?? 3;
    if (paidCount >= maxDuration) {
      return res
        .status(400)
        .json({ message: "Salary duration already completed" });
    }

    // Dedup: already paid this month?
    const alreadyPaid = await RankSalaryLog.findOne({
      userId: user._id,
      rankName: rank.name,
      year: currentYear,
      month: currentMonth,
    });
    if (alreadyPaid) {
      return res
        .status(400)
        .json({ message: "Salary already released for this month" });
    }

    // Monthly sales condition
    const salesAgg = await Purchase.aggregate([
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
            $elemMatch: { level: 1, userId: user._id },
          },
        },
      },
      { $group: { _id: null, count: { $sum: "$quantity" } } },
    ]);
    const monthlySalesCount: number = salesAgg[0]?.count ?? 0;
    const minMonthlySalesQty: number = sal.minMonthlySalesQty ?? 0;
    if (monthlySalesCount < minMonthlySalesQty) {
      return res.status(400).json({
        message: `Monthly sales condition not met (${monthlySalesCount}/${minMonthlySalesQty})`,
      });
    }

    // Personal purchase condition
    const minTotalPersonalQty: number =
      sal.minTotalPersonalPurchaseQtyForSalary ?? 0;
    if (minTotalPersonalQty > 0) {
      const personalCount: number = (user as any).personalPurchaseCount ?? 0;
      if (personalCount < minTotalPersonalQty) {
        return res.status(400).json({
          message: `Personal purchase condition not met (${personalCount}/${minTotalPersonalQty})`,
        });
      }
    }

    // All conditions met — release salary
    const updatedWallet = await Wallet.findOneAndUpdate(
      { userId: user._id },
      { $inc: { salaryBalanceFromRanks: sal.amount, totalBalance: sal.amount } },
      { new: true, upsert: true }
    );

    await TransactionLog.create({
      userId: user._id,
      type: "salary",
      amount: sal.amount,
      balanceAfter: updatedWallet.salaryBalanceFromRanks,
      note: `Monthly salary — Rank: ${rank.name}, Month: ${currentYear}-${String(currentMonth).padStart(2, "0")}, ৳${sal.amount.toLocaleString()} (payment ${paidCount + 1}/${maxDuration}) [manual]`,
    });

    try {
      await CompanyLedger.create({
        date: new Date(),
        type: "salary_paid",
        amount: sal.amount,
        userId: user._id,
        note: `Monthly salary — Rank: ${rank.name}, Month: ${currentYear}-${String(currentMonth).padStart(2, "0")}, ৳${sal.amount.toLocaleString()} (payment ${paidCount + 1}/${maxDuration}) [manual]`,
      });
    } catch (ledgerErr) {
      console.error(`[LEDGER ERROR] rank salary_paid for userId=${user._id}:`, ledgerErr);
    }

    await RankSalaryLog.create({
      userId: user._id,
      rankName: rank.name,
      year: currentYear,
      month: currentMonth,
    });

    res.json({
      message: `Salary of ৳${sal.amount.toLocaleString()} released for ${rank.name}`,
      amount: sal.amount,
      month: `${currentYear}-${String(currentMonth).padStart(2, "0")}`,
    });
  } catch (err) {
    next(err);
  }
};
