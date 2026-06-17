import { Request, Response, NextFunction } from "express";
import { Purchase } from "./model";
import { Share } from "../share/model";
import { User } from "../user/model";
import { Settings } from "../settings/model";
import { calculateCertificateStatus, calculateTotalPayable } from "./service";
import { Certificate } from "../certificate/model";

// POST /purchase  — logged-in user submits a purchase request
export const createPurchase = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { shareId, quantity, paymentType, downPayment, installmentCount, senderAccount, transactionId, buyerInfo } = req.body;

    const share = await Share.findById(shareId);
    if (!share)
      return res.status(404).json({ message: "Share not found" });

    const buyer = await User.findById(req.user!._id).select("name phone nominee nominee2");
    const resolvedBuyerInfo = buyerInfo ?? (buyer ? {
      name: buyer.name,
      phone: buyer.phone,
      nominee: buyer.nominee ?? undefined,
      nominee2: buyer.nominee2 ?? undefined,
    } : null);

    const qty = Number(quantity);
    const totalPayable = share.cashPrice * qty;

    // Cash: fixed DP = cashDownPaymentLimit, 1 installment for remainder
    // Installment: user-provided DP and installmentCount
    const resolvedDP =
      paymentType === "cash" ? share.cashDownPaymentLimit * qty : Number(downPayment) * qty;
    const resolvedCount = paymentType === "cash" ? 1 : Number(installmentCount);
    const resolvedInstallmentAmount = Math.ceil((totalPayable - resolvedDP) / resolvedCount);
    const amountPaid = resolvedDP;

    // Build snapshot — locks all commission/config + rank/salary rules at time of purchase
    const settings = await Settings.findOne().lean();
    const ranks = (settings?.ranks ?? []) as any[];
    const snapshot = {
      shareTitle: share.title,
      shareImage: share.image,
      cashPrice: share.cashPrice,
      cashDownPaymentLimit: share.cashDownPaymentLimit,
      directSaleCommissionValue: share.directSaleCommissionValue,
      downPaymentGenerationRates: share.downPaymentGenerationRates,
      installmentCommissionRate: share.installmentCommissionRate,
      rankQualification: ranks.map((r: any) => ({
        rankName: r.name,
        order: r.order,
        requiredGeneration: r.requiredGeneration ?? 1,
        requiredApprovedSales: r.requiredApprovedSales ?? 0,
      })),
      salaryRules: ranks
        .filter((r: any) => r.salary?.amount > 0)
        .map((r: any) => ({
          rankName: r.name,
          amount: r.salary.amount,
          durationMonths: r.salary.durationMonths,
          minMonthlySales: r.salary.minMonthlySales,
          requiredPersonalShares: r.salary.requiredPersonalShares,
          requiredPersonalPurchaseAmount: r.salary.requiredPersonalPurchaseAmount,
        })),
    };

    const purchase = await Purchase.create({
      userId: req.user!._id,
      shareId,
      quantity: qty,
      paymentType,
      downPayment: resolvedDP,
      installmentCount: resolvedCount,
      installmentAmount: resolvedInstallmentAmount,
      amountPaid,
      senderAccount,
      transactionId,
      buyerInfo: resolvedBuyerInfo,
      snapshot,
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
