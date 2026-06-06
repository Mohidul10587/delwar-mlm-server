import { Request, Response, NextFunction } from "express";
import { Purchase } from "./model";
import { Share } from "../share/model";
import { calculateCertificateStatus, calculateTotalPayable } from "./service";
import { Certificate } from "../certificate/model";

// POST /purchase  — logged-in user submits a purchase request
export const createPurchase = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { shareId, quantity, paymentType, senderAccount, transactionId } = req.body;

    const share = await Share.findById(shareId);
    if (!share)
      return res.status(404).json({ message: "Share not found" });

    const qty = Number(quantity);
    const amountPaid =
      paymentType === "cash"
        ? share.cashPrice * qty
        : share.installment.downPayment * qty;

    const purchase = await Purchase.create({
      userId: req.user!._id,
      shareId,
      quantity: qty,
      paymentType,
      amountPaid,
      senderAccount,
      transactionId,
    });

    await Certificate.create({
      userId: req.user!._id,
      purchaseId: purchase._id,
      shareId,
      status: "pending",
    });

    res.status(201).json({
      message: "Purchase submitted, awaiting approval",
      purchase,
    });
  } catch (err) {
    next(err);
  }
};

// GET /purchase  — superadmin gets all purchases (populated)
export const getPurchases = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const purchases = await Purchase.find()
      .populate("userId", "name username phone")
      .populate("shareId", "title cashPrice installment")
      .sort({ createdAt: -1 })
      .lean();
    const enriched = purchases.map((purchase) => {
      const sharePrice = Number((purchase as any)?.shareId?.cashPrice ?? 0);
      const totalPayable = calculateTotalPayable(sharePrice, purchase.quantity);
      return {
        ...purchase,
        totalPayable,
        certificateStatus: calculateCertificateStatus({
          status: purchase.status,
          paymentType: purchase.paymentType,
          amountPaid: purchase.amountPaid,
          totalPayable,
        }),
      };
    });
    res.json({ purchases: enriched });
  } catch (err) {
    next(err);
  }
};

// GET /purchase/my  — logged-in user sees their own purchases
export const getMyPurchases = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const purchases = await Purchase.find({ userId: req.user!._id })
      .populate("shareId", "title cashPrice installment image")
      .sort({ createdAt: -1 })
      .lean();
    const enriched = purchases.map((purchase) => {
      const sharePrice = Number((purchase as any)?.shareId?.cashPrice ?? 0);
      const totalPayable = calculateTotalPayable(sharePrice, purchase.quantity);
      return {
        ...purchase,
        totalPayable,
        certificateStatus: calculateCertificateStatus({
          status: purchase.status,
          paymentType: purchase.paymentType,
          amountPaid: purchase.amountPaid,
          totalPayable,
        }),
      };
    });
    res.json({ purchases: enriched });
  } catch (err) {
    next(err);
  }
};
