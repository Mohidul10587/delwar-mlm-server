import { Request, Response, NextFunction } from "express";
import { Share as Share } from "./model";
import { Settings } from "../settings/model";

export const createShare = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await Settings.findOne();
    const defaultCommissions = settings?.defaultCommissions ?? {
      directSalesCommissionForCashSell: 0,
      directSalesCommissionForInstallmentSell: 0,
      managerialCommissionForCashSell: 0,
      managerialCommissionForInstallmentSell: 0,
    };
    const pkg = await Share.create({
      directSalesCommissionForCashSell:          defaultCommissions.directSalesCommissionForCashSell,
      directSalesCommissionForInstallmentSell:   defaultCommissions.directSalesCommissionForInstallmentSell,
      managerialCommissionForCashSell:           defaultCommissions.managerialCommissionForCashSell,
      managerialCommissionForInstallmentSell:    defaultCommissions.managerialCommissionForInstallmentSell,
      ...req.body,
    });
    res.status(201).json({ message: { en: "Share created", bn: "প্যাকেজ তৈরি হয়েছে" }, pkg });
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
        message: { en: "Share not found", bn: "প্যাকেজ পাওয়া যায়নি" },
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
        message: { en: "Share not found", bn: "প্যাকেজ পাওয়া যায়নি" },
      });
    res.json({
      message: { en: "Share updated", bn: "প্যাকেজ আপডেট হয়েছে" },
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
        message: { en: "Share not found", bn: "প্যাকেজ পাওয়া যায়নি" },
      });
    res.json({
      message: { en: "Share deleted", bn: "প্যাকেজ মুছে ফেলা হয়েছে" },
    });
  } catch (err) {
    next(err);
  }
};
