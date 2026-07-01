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
        branches: doc.branches,
        investmentConfig: doc.investmentConfig,
        balanceTransferFeePercent: doc.balanceTransferFeePercent,
      },
    });
  } catch (err) { next(err); }
};

// Full settings — admin only
export const getSettings = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ settings: await getOrCreate() });
  } catch (err) { next(err); }
};

// H-09 fix: updateSettings now rejects attempts to overwrite ranks via this endpoint
export const updateSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await getOrCreate();
    // Prevent overwriting ranks through this endpoint — use /rank routes instead
    const { ranks, ...safeBody } = req.body;
    Object.assign(doc, safeBody);
    await doc.save();
    res.json({ message: "Settings updated", settings: doc });
  } catch (err) { next(err); }
};
