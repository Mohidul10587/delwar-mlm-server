import { Request, Response, NextFunction } from "express";
import { Settings } from "./model";

const getOrCreate = async () => {
  const doc = await Settings.findOne();
  return doc ?? (await Settings.create({}));
};

export const getSettings = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ settings: await getOrCreate() });
  } catch (err) { next(err); }
};

export const updateSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await getOrCreate();
    Object.assign(doc, req.body);
    await doc.save();
    res.json({ message: "Settings updated", settings: doc });
  } catch (err) { next(err); }
};
