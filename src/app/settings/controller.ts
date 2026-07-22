import { Request, Response, NextFunction } from "express";
import { Settings } from "./model";

const getOrCreate = async () => {
  // L-09 fix: atomic upsert — prevents two concurrent requests creating two Settings docs
  return await Settings.findOneAndUpdate(
    {},
    { $setOnInsert: {} },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

// Legacy Settings documents may contain fields from retired modules. Never
// expose or accept them through the active Settings API.
const withoutRetiredSettingsFields = (doc: any) => {
  const settings = doc.toObject
    ? doc.toObject({ schemaFieldsOnly: true })
    : { ...doc };
  delete settings.branches;
  return settings;
};

// H-02 fix: public endpoint returns only UI-safe fields (no financial/sensitive data)
export const getPublicSettings = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await getOrCreate();
    res.json({
      settings: {
        siteTitle: doc.siteTitle,
        siteTagline: doc.siteTagline,
        logo: doc.logo,
        favicon: doc.favicon,
        metaDescription: doc.metaDescription,
        metaKeywords: doc.metaKeywords,
        contactPhone: doc.contactPhone,
        contactEmail: doc.contactEmail,
        contactAddress: doc.contactAddress,
        socialFacebook: doc.socialFacebook,
        socialYoutube: doc.socialYoutube,
        investmentConfig: doc.investmentConfig,
        balanceTransferFeePercent: doc.balanceTransferFeePercent,
        // Return only active payment methods for checkout display
        companyPaymentMethods: (doc.companyPaymentMethods ?? []).filter(m => m.isActive),
      },
    });
  } catch (err) { next(err); }
};

// Full settings — admin only
export const getSettings = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ settings: withoutRetiredSettingsFields(await getOrCreate()) });
  } catch (err) { next(err); }
};

// H-09 fix: updateSettings now rejects attempts to overwrite ranks via this endpoint
export const updateSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await getOrCreate();
    // Prevent overwriting ranks through this endpoint — use /rank routes instead
    const { ranks, companyPaymentMethods, branches, ...safeBody } = req.body;
    Object.assign(doc, safeBody);
    await doc.save();
    res.json({ message: "Settings updated", settings: withoutRetiredSettingsFields(doc) });
  } catch (err) { next(err); }
};

// PATCH /settings/reward-config — update reward configuration
export const updateRewardConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { enabled, cycleTargetAmount, fullPaymentRewardAmount, splitPaymentRewardAmount } = req.body;
    const doc = await getOrCreate();

    if (enabled !== undefined) doc.rewardConfig.enabled = Boolean(enabled);
    if (cycleTargetAmount !== undefined) {
      const val = Number(cycleTargetAmount);
      if (isNaN(val) || val <= 0) {
        return res.status(400).json({ message: "cycleTargetAmount must be a positive number" });
      }
      doc.rewardConfig.cycleTargetAmount = val;
    }
    if (fullPaymentRewardAmount !== undefined) {
      const val = Number(fullPaymentRewardAmount);
      if (isNaN(val) || val < 0) {
        return res.status(400).json({ message: "fullPaymentRewardAmount must be >= 0" });
      }
      doc.rewardConfig.fullPaymentRewardAmount = val;
    }
    if (splitPaymentRewardAmount !== undefined) {
      const val = Number(splitPaymentRewardAmount);
      if (isNaN(val) || val < 0) {
        return res.status(400).json({ message: "splitPaymentRewardAmount must be >= 0" });
      }
      doc.rewardConfig.splitPaymentRewardAmount = val;
    }

    await doc.save();
    res.json({ message: "Reward config updated", rewardConfig: doc.rewardConfig });
  } catch (err) { next(err); }
};

// GET /settings/payment-methods — all payment methods (admin)
export const getCompanyPaymentMethods = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await getOrCreate();
    res.json({ paymentMethods: doc.companyPaymentMethods ?? [] });
  } catch (err) { next(err); }
};

// POST /settings/payment-methods — add a new payment method
export const addCompanyPaymentMethod = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, label, accountNumber, accountName, branchName, isActive } = req.body;

    if (!type || !["bank", "bkash", "nagad", "rocket"].includes(type)) {
      return res.status(400).json({ message: "Invalid type. Must be bank, bkash, nagad, or rocket" });
    }
    if (!label || !String(label).trim()) {
      return res.status(400).json({ message: "Label is required" });
    }
    if (!accountNumber || !String(accountNumber).trim()) {
      return res.status(400).json({ message: "Account number is required" });
    }

    const doc = await getOrCreate();
    doc.companyPaymentMethods.push({
      type,
      label: String(label).trim(),
      accountNumber: String(accountNumber).trim(),
      accountName: accountName ? String(accountName).trim() : "",
      branchName: branchName ? String(branchName).trim() : "",
      isActive: isActive !== false,
    });
    await doc.save();
    res.status(201).json({ message: "Payment method added", paymentMethods: doc.companyPaymentMethods });
  } catch (err) { next(err); }
};

// PUT /settings/payment-methods/:id — update a payment method
export const updateCompanyPaymentMethod = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { type, label, accountNumber, accountName, branchName, isActive } = req.body;

    const doc = await getOrCreate();
    const entry = doc.companyPaymentMethods.find(
      (m: any) => m._id.toString() === id
    );
    if (!entry) return res.status(404).json({ message: "Payment method not found" });

    if (type !== undefined) {
      if (!["bank", "bkash", "nagad", "rocket"].includes(type)) {
        return res.status(400).json({ message: "Invalid type" });
      }
      entry.type = type;
    }
    if (label !== undefined) entry.label = String(label).trim();
    if (accountNumber !== undefined) entry.accountNumber = String(accountNumber).trim();
    if (accountName !== undefined) entry.accountName = String(accountName).trim();
    if (branchName !== undefined) entry.branchName = String(branchName).trim();
    if (isActive !== undefined) entry.isActive = Boolean(isActive);

    await doc.save();
    res.json({ message: "Payment method updated", paymentMethods: doc.companyPaymentMethods });
  } catch (err) { next(err); }
};

// PATCH /settings/payment-methods/:id/toggle — toggle active status
export const toggleCompanyPaymentMethod = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const doc = await getOrCreate();
    const entry = doc.companyPaymentMethods.find(
      (m: any) => m._id.toString() === id
    );
    if (!entry) return res.status(404).json({ message: "Payment method not found" });

    entry.isActive = !entry.isActive;
    await doc.save();
    res.json({ message: `Payment method ${entry.isActive ? "activated" : "deactivated"}`, paymentMethods: doc.companyPaymentMethods });
  } catch (err) { next(err); }
};

// DELETE /settings/payment-methods/:id — delete a payment method
export const deleteCompanyPaymentMethod = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const doc = await getOrCreate();
    const before = doc.companyPaymentMethods.length;
    doc.companyPaymentMethods = doc.companyPaymentMethods.filter(
      (m: any) => m._id.toString() !== id
    ) as typeof doc.companyPaymentMethods;
    if (doc.companyPaymentMethods.length === before) {
      return res.status(404).json({ message: "Payment method not found" });
    }
    await doc.save();
    res.json({ message: "Payment method deleted", paymentMethods: doc.companyPaymentMethods });
  } catch (err) { next(err); }
};
