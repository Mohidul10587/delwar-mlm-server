import { Request, Response, NextFunction } from "express";
import { Settings } from "../settings/model";

/**
 * Atomic upsert helper — ensures a Settings document always exists.
 */
const getOrCreateSettings = async () => {
  return await Settings.findOneAndUpdate(
    {},
    { $setOnInsert: {} },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

/**
 * GET /reward-rules
 * Returns all reward rules.
 */
export const getRewardRules = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const settings = await getOrCreateSettings();
    const rules = settings.installmentRewardRules ?? [];
    res.json({ rules });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /reward-rules/public
 * Returns all rules sorted by targetAmount — safe for frontend display (no auth required).
 */
export const getPublicRewardRules = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const settings = await getOrCreateSettings();
    const rules = [...(settings.installmentRewardRules ?? [])].sort(
      (a, b) => a.targetAmount - b.targetAmount
    );
    res.json({ rules });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /reward-rules
 * Add a new reward rule.
 * Body: { targetAmount, oneTimeReward, installmentCompletionReward }
 */
export const addRewardRule = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { targetAmount, oneTimeReward, installmentCompletionReward } = req.body;

    if (
      typeof targetAmount !== "number" || targetAmount <= 0 ||
      typeof oneTimeReward !== "number" || oneTimeReward < 0 ||
      typeof installmentCompletionReward !== "number" || installmentCompletionReward < 0
    ) {
      return res.status(400).json({
        message:
          "targetAmount (>0), oneTimeReward (>=0), and installmentCompletionReward (>=0) are required numbers",
      });
    }

    const settings = await getOrCreateSettings();

    // Prevent duplicate targetAmount
    const existing = (settings.installmentRewardRules ?? []).find(
      (r) => r.targetAmount === targetAmount
    );
    if (existing) {
      return res.status(409).json({
        message: `A reward rule for targetAmount ৳${targetAmount.toLocaleString()} already exists`,
      });
    }

    settings.installmentRewardRules = [
      ...(settings.installmentRewardRules ?? []),
      { targetAmount, oneTimeReward, installmentCompletionReward },
    ];

    await settings.save();
    res.status(201).json({ message: "Reward rule added", rules: settings.installmentRewardRules });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /reward-rules/:targetAmount
 * Update an existing reward rule identified by its targetAmount.
 * Body: { oneTimeReward?, installmentCompletionReward?, newTargetAmount? }
 */
export const updateRewardRule = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const targetAmount = Number(req.params.targetAmount);
    if (isNaN(targetAmount) || targetAmount <= 0) {
      return res.status(400).json({ message: "Invalid targetAmount in URL" });
    }

    const settings = await getOrCreateSettings();
    const rules = settings.installmentRewardRules ?? [];
    const ruleIndex = rules.findIndex((r) => r.targetAmount === targetAmount);

    if (ruleIndex === -1) {
      return res.status(404).json({
        message: `No reward rule found for targetAmount ৳${targetAmount.toLocaleString()}`,
      });
    }

    const { oneTimeReward, installmentCompletionReward, newTargetAmount } = req.body;

    // If newTargetAmount is provided, check it doesn't conflict
    if (typeof newTargetAmount === "number" && newTargetAmount !== targetAmount) {
      const conflict = rules.find((r, i) => r.targetAmount === newTargetAmount && i !== ruleIndex);
      if (conflict) {
        return res.status(409).json({
          message: `A rule with targetAmount ৳${newTargetAmount.toLocaleString()} already exists`,
        });
      }
    }

    // Apply updates
    const rule = rules[ruleIndex];
    if (typeof newTargetAmount === "number" && newTargetAmount > 0) rule.targetAmount = newTargetAmount;
    if (typeof oneTimeReward === "number" && oneTimeReward >= 0) rule.oneTimeReward = oneTimeReward;
    if (typeof installmentCompletionReward === "number" && installmentCompletionReward >= 0)
      rule.installmentCompletionReward = installmentCompletionReward;

    settings.installmentRewardRules = rules;
    settings.markModified("installmentRewardRules");
    await settings.save();

    res.json({ message: "Reward rule updated", rules: settings.installmentRewardRules });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /reward-rules/:targetAmount
 * Remove a reward rule by its targetAmount.
 */
export const deleteRewardRule = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const targetAmount = Number(req.params.targetAmount);
    if (isNaN(targetAmount) || targetAmount <= 0) {
      return res.status(400).json({ message: "Invalid targetAmount in URL" });
    }

    const settings = await getOrCreateSettings();
    const rules = settings.installmentRewardRules ?? [];
    const initialLength = rules.length;

    settings.installmentRewardRules = rules.filter(
      (r) => r.targetAmount !== targetAmount
    );

    if (settings.installmentRewardRules.length === initialLength) {
      return res.status(404).json({
        message: `No reward rule found for targetAmount ৳${targetAmount.toLocaleString()}`,
      });
    }

    settings.markModified("installmentRewardRules");
    await settings.save();

    res.json({ message: "Reward rule deleted", rules: settings.installmentRewardRules });
  } catch (err) {
    next(err);
  }
};
