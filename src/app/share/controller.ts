import { Request, Response, NextFunction } from "express";
import { Share as Share } from "./model";
import { Settings } from "../settings/model";

export const createShare = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await Settings.findOne();
    const defaults = settings?.defaultShareConfig ?? {};
    const pkg = await Share.create({ ...defaults, ...req.body });
    res.status(201).json({ message: "Share created", pkg });
  } catch (err) { next(err); }
};

export const getShares = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const shares = await Share.find({ isActive: true }).lean();
    res.json({ shares });
  } catch (err) {
    next(err);
  }
};

export const getShareById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const pkg = await Share.findById(req.params.id).lean();
    if (!pkg)
      return res.status(404).json({
        message: "Share not found",
      });
    res.json({ pkg });
  } catch (err) {
    next(err);
  }
};

export const updateShare = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const pkg = await Share.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!pkg)
      return res.status(404).json({
        message: "Share not found",
      });
    res.json({
      message: "Share updated",
      pkg,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteShare = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const pkg = await Share.findByIdAndDelete(req.params.id);
    if (!pkg)
      return res.status(404).json({
        message: "Share not found",
      });
    res.json({
      message: "Share deleted",
    });
  } catch (err) {
    next(err);
  }
};
