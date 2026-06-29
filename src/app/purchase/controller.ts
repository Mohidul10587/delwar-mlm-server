import { Request, Response, NextFunction } from "express";
import { Purchase } from "./model";
import { InstallmentPayment } from "./installment.model";
import { Share } from "../share/model";
import { User } from "../user/model";
import { Settings } from "../settings/model";
import { calculateCertificateStatus, calculateTotalPayable } from "./service";
import { Certificate } from "../certificate/model";
import { ShareSlot } from "../share/shareSlot.model";

// Helper — build slotsByPurchase map from a list of purchaseIds
async function fetchSlotsByPurchase(purchaseIds: any[]): Promise<Record<string, string[]>> {
  if (!purchaseIds.length) return {};
  const slots = await ShareSlot.find({
    purchaseId: { $in: purchaseIds },
    status: "sold",
  })
    .select("purchaseId shareNumber")
    .sort({ shareNumber: 1 })
    .lean();
  const map: Record<string, string[]> = {};
  for (const s of slots) {
    const key = s.purchaseId!.toString();
    (map[key] ??= []).push(s.shareNumber);
  }
  return map;
}

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

    const resolvedDP =
      paymentType === "cash" ? share.maxDownPayment * qty : Number(downPayment) * qty;
    const resolvedCount = paymentType === "cash" ? 1 : Number(installmentCount);
    const resolvedInstallmentAmount = Math.ceil((totalPayable - resolvedDP) / resolvedCount);
    const amountPaid = resolvedDP;

    const settings = await Settings.findOne().lean();
    const ranks = (settings?.ranks ?? []) as any[];
    const snapshot = {
      shareTitle: share.title,
      shareImage: share.image,
      cashPrice: share.cashPrice,
      minDownPayment: share.minDownPayment,
      maxDownPayment: share.maxDownPayment,
      directSaleCommissionValue: share.directSaleCommissionValue,
      downPaymentGenerationRates: share.downPaymentGenerationRates,
      installmentCommissionRate: share.installmentCommissionRate,
      rankQualification: ranks.map((r: any) => ({
        rankName: r.name,
        order: r.order,
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

    const installmentPurchaseIds = purchases
      .filter((p) => p.paymentType === "installment" && p.status !== "pending")
      .map((p) => p._id);
    const allPayments = installmentPurchaseIds.length
      ? await InstallmentPayment.find({ purchaseId: { $in: installmentPurchaseIds } }).lean()
      : [];
    const paymentsByPurchase: Record<string, typeof allPayments> = {};
    for (const pay of allPayments) {
      const key = pay.purchaseId.toString();
      (paymentsByPurchase[key] ??= []).push(pay);
    }

    // Fetch share slots for approved purchases
    const approvedIds = purchases
      .filter((p) => p.status === "approved")
      .map((p) => p._id);
    const slotsByPurchase = await fetchSlotsByPurchase(approvedIds);

    const enriched = purchases.map((purchase) => {
      const sharePrice = Number((purchase as any)?.shareId?.cashPrice ?? 0);
      const totalPayable = calculateTotalPayable(sharePrice, purchase.quantity);
      const base = {
        ...purchase,
        totalPayable,
        shareNumbers: slotsByPurchase[purchase._id.toString()] ?? [],
        certificateStatus: calculateCertificateStatus({
          status: purchase.status,
          paymentType: purchase.paymentType,
          amountPaid: purchase.amountPaid,
          totalPayable,
        }),
      };
      if (purchase.paymentType !== "installment" || purchase.status === "pending") return base;
      const payments = paymentsByPurchase[purchase._id.toString()] ?? [];
      const perInstallment = purchase.installmentAmount ?? 0;
      const totalInstallments = purchase.installmentCount ?? 0;
      const completed = payments.filter((p) => p.status === "approved").length;
      const amountRemaining = Math.max(0, totalPayable - purchase.amountPaid);
      return {
        ...base,
        installmentSummary: {
          totalInstallments,
          completed,
          remaining: Math.max(0, totalInstallments - completed),
          perInstallment,
          amountPaid: purchase.amountPaid,
          amountRemaining,
          payments,
        },
      };
    });
    res.json({ purchases: enriched });
  } catch (err) {
    next(err);
  }
};

// GET /purchase/:id  — staff gets a single purchase by id
export const getPurchaseById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const purchase = await Purchase.findById(req.params.id)
      .populate("userId", "name username phone")
      .populate("shareId", "title cashPrice installment")
      .lean();
    if (!purchase) return res.status(404).json({ message: "Purchase not found" });

    const sharePrice = Number((purchase as any)?.shareId?.cashPrice ?? 0);
    const totalPayable = calculateTotalPayable(sharePrice, purchase.quantity);

    const slots = await ShareSlot.find({ purchaseId: purchase._id, status: "sold" })
      .select("shareNumber")
      .sort({ shareNumber: 1 })
      .lean();

    res.json({
      purchase: {
        ...purchase,
        totalPayable,
        shareNumbers: slots.map((s) => s.shareNumber),
        certificateStatus: calculateCertificateStatus({
          status: purchase.status,
          paymentType: purchase.paymentType,
          amountPaid: purchase.amountPaid,
          totalPayable,
        }),
      },
    });
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

    const approvedIds = purchases
      .filter((p) => p.status === "approved")
      .map((p) => p._id);
    const slotsByPurchase = await fetchSlotsByPurchase(approvedIds);

    const enriched = purchases.map((purchase) => {
      const sharePrice = Number((purchase as any)?.shareId?.cashPrice ?? 0);
      const totalPayable = calculateTotalPayable(sharePrice, purchase.quantity);
      return {
        ...purchase,
        totalPayable,
        shareNumbers: slotsByPurchase[purchase._id.toString()] ?? [],
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
