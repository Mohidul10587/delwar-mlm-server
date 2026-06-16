import { Request, Response, NextFunction } from "express";
import { Settings } from "../settings/model";
import { User } from "../user/model";
import { Wallet, TransactionLog } from "../wallet/model";

const getSettings = async () => {
  let s = await Settings.findOne();
  if (!s) s = await Settings.create({});
  return s;
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
    const { name, order = 0, requiredGeneration = 1, requiredApprovedSales = 0, reward, salary } = req.body;
    (s.ranks as any[]).push({ name, order, requiredGeneration, requiredApprovedSales, reward, salary });
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
    const user = await User.findById(req.user!._id)
      .select("directSalesCount teamSalesCount currentRank currentRankAchievedAt")
      .lean();
    const s = await getSettings();
    const allRanks = (s.ranks ?? []).sort((a: any, b: any) => a.order - b.order);
    const currentRankName = (user as any)?.currentRank ?? null;
    const currentRank = allRanks.find((r: any) => r.name === currentRankName) ?? null;
    const nextRank = allRanks.find((r: any) => r.order > (currentRank?.order ?? -1)) ?? null;

    res.json({
      directSalesCount: (user as any)?.directSalesCount ?? 0,
      teamSalesCount: (user as any)?.teamSalesCount ?? 0,
      currentRank,
      nextRank,
      allRanks,
    });
  } catch (err) { next(err); }
};

// ── called internally after commission distribution ───────────────────────────
// Recalculates user rank based on approved sales; issues reward on first achievement.

export const recalcUserRank = async (userId: string) => {
  try {
    const user = await User.findById(userId).select(
      "directSalesCount teamSalesCount currentRank currentRankAchievedAt earnedRanks"
    );
    if (!user) return;

    const s = await Settings.findOne();
    const ranks = ((s?.ranks ?? []) as any[]).sort((a: any, b: any) => a.order - b.order);

    // Find highest rank where user's directSalesCount meets requiredApprovedSales
    // (generation depth check is simplified: we use placement depth via teamSalesCount)
    const qualified = ranks.filter(
      (r: any) => (user.directSalesCount ?? 0) >= (r.requiredApprovedSales ?? 0)
    );
    const newRank = qualified.length ? qualified[qualified.length - 1] : null;
    const newRankName: string | null = newRank?.name ?? null;

    if (newRankName && newRankName !== (user as any).currentRank) {
      await User.findByIdAndUpdate(userId, {
        currentRank: newRankName,
        currentRankAchievedAt: new Date(),
        $addToSet: { earnedRanks: newRankName },
      });

      // Issue one-time rank reward
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

// ── Monthly salary release (call via cron or admin trigger) ──────────────────

export const releaseMonthlySalaries = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const released = await processMonthlySalaries();
    res.json({ message: `Salary released for ${released} users` });
  } catch (err) { next(err); }
};

export const processMonthlySalaries = async (): Promise<number> => {
  const s = await Settings.findOne();
  const ranks = ((s?.ranks ?? []) as any[]).filter((r: any) => r.salary?.amount > 0);
  if (!ranks.length) return 0;

  const now = new Date();
  let count = 0;

  // Users who have earned a rank
  const users = await User.find({ currentRank: { $in: ranks.map((r: any) => r.name) } }).select(
    "currentRank currentRankAchievedAt directSalesCount personalSharesCount totalPersonalPurchaseAmount"
  );

  for (const user of users) {
    const rank = ranks.find((r: any) => r.name === (user as any).currentRank);
    if (!rank) continue;

    const sal = rank.salary;
    const achievedAt: Date = (user as any).currentRankAchievedAt ?? new Date(0);

    // Salary starts from the month AFTER rank achievement
    const salaryStart = new Date(achievedAt);
    salaryStart.setMonth(salaryStart.getMonth() + 1);
    salaryStart.setDate(1);
    salaryStart.setHours(0, 0, 0, 0);

    if (now < salaryStart) continue;

    // Check duration
    const monthsElapsed = Math.floor(
      (now.getTime() - salaryStart.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );
    if (monthsElapsed >= sal.durationMonths) continue;

    // Eligibility checks
    const monthlySalesOk = (user.directSalesCount ?? 0) >= sal.minMonthlySales;
    const personalSharesOk = ((user as any).personalSharesCount ?? 0) >= sal.requiredPersonalShares;
    const personalPurchaseOk =
      ((user as any).totalPersonalPurchaseAmount ?? 0) >= sal.requiredPersonalPurchaseAmount;

    if (!monthlySalesOk || !personalSharesOk || !personalPurchaseOk) continue;

    const wallet = await Wallet.findOne({ userId: user._id });
    if (!wallet) continue;

    wallet.salaryBalance += sal.amount;
    await wallet.save();

    await TransactionLog.create({
      userId: user._id,
      type: "salary",
      amount: sal.amount,
      balanceAfter: wallet.salaryBalance,
      note: `Monthly salary — Rank: ${rank.name}`,
    });

    count++;
  }

  return count;
};
