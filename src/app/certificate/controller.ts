import { Request, Response, NextFunction } from "express";
import { Certificate } from "./model";
import { calculateTotalPayable } from "../purchase/service";

// GET /certificate/my — logged-in user's own certificates with share & purchase info
export const getMyCertificates = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const certificates = await Certificate.find({ userId: req.user!._id })
      .populate("shareId", "title image cashPrice installment")
      .populate("purchaseId", "paymentType amountPaid quantity status")
      .sort({ createdAt: -1 })
      .lean();

    const enriched = certificates.map((c) => {
      const share = c.shareId as any;
      const purchase = c.purchaseId as any;
      const totalPayable = share?.cashPrice
        ? calculateTotalPayable(Number(share.cashPrice), purchase?.quantity ?? 1)
        : 0;
      const amountPaid = purchase?.amountPaid ?? 0;
      return {
        ...c,
        totalPayable,
        amountRemaining: Math.max(0, totalPayable - amountPaid),
      };
    });

    res.json({ certificates: enriched });
  } catch (err) { next(err); }
};
