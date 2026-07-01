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

    // Fix V-01: validate quantity
    const qty = parseInt(String(quantity), 10);
    if (!Number.isInteger(qty) || qty < 1) {
      return res.status(400).json({ message: "Quantity must be a positive integer" });
    }

    // Fix F-10: check transactionId uniqueness before creating purchase
    if (!transactionId || !String(transactionId).trim()) {
      return res.status(400).json({ message: "Transaction ID is required" });
    }
    const { isTransactionIdUsed } = await import("../../utils/isTransactionIdUsed");
    const duplicate = await isTransactionIdUsed(String(transactionId).trim());
    if (duplicate) {
      return res.status(400).json({ message: "This transaction ID has already been used" });
    }

    if (!["cash", "installment"].includes(paymentType)) {
      return res.status(400).json({ message: "Invalid payment type" });
    }

    const share = await Share.findById(shareId);
    if (!share)
      return res.status(404).json({ message: "Share not found" });

    if (!share.isActive)
      return res.status(400).json({ message: "This share is not available for purchase" });

    // Fix F-11: validate down payment range for installment
    if (paymentType === "installment") {
      const dp = Number(downPayment);
      if (isNaN(dp) || dp < share.minDownPayment || dp > share.maxDownPayment) {
        return res.status(400).json({
          message: `Down payment per unit must be between ৳${share.minDownPayment.toLocaleString()} and ৳${share.maxDownPayment.toLocaleString()}`,
        });
      }
      // Fix F-14: validate installment count range
      const ic = parseInt(String(installmentCount), 10);
      if (!Number.isInteger(ic) || ic < share.minInstallments || ic > share.maxInstallments) {
        return res.status(400).json({
          message: `Installment count must be between ${share.minInstallments} and ${share.maxInstallments}`,
        });
      }
    }

    const buyer = await User.findById(req.user!._id).select("name phone nominee nominee2");
    const resolvedBuyerInfo = buyerInfo ?? (buyer ? {
      name: buyer.name,
      phone: buyer.phone,
      nominee: buyer.nominee ?? undefined,
      nominee2: buyer.nominee2 ?? undefined,
    } : null);

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
      transactionId: String(transactionId).trim(),
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

// GET /purchase  — superadmin gets all purchases (populated, paginated)
export const getPurchases = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // H-05 fix: pagination
    const page  = parseInt(req.query.page  as string) || 1;
    const limit = parseInt(req.query.limit as string) || 30;
    const skip  = (page - 1) * limit;

    const filter: any = {};
    if (req.query.status) filter.status = req.query.status;

    const [purchases, total] = await Promise.all([
      Purchase.find(filter)
        .populate("userId", "name username phone")
        .populate("shareId", "title cashPrice installment")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Purchase.countDocuments(filter),
    ]);

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
    res.json({ purchases: enriched, total, page, pages: Math.ceil(total / limit) });
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

// GET /purchase/:id/receipt  — logged-in user gets receipt for an approved purchase
export const getPurchaseReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const purchase = await Purchase.findById(req.params.id)
      .populate("userId", "name username phone")
      .populate("shareId", "title cashPrice image")
      .lean();

    if (!purchase) return res.status(404).json({ message: "Purchase not found" });

    // Only the owner or admin can access
    const isOwner = purchase.userId && (purchase.userId as any)._id?.toString() === req.user!._id.toString();
    const isStaff = ["superadmin", "admin", "staff"].includes(req.user!.role);
    if (!isOwner && !isStaff) return res.status(403).json({ message: "Forbidden" });

    if (purchase.status !== "approved")
      return res.status(400).json({ message: "Receipt only available for approved purchases" });

    // Fetch share slot numbers
    const slots = await ShareSlot.find({ purchaseId: purchase._id, status: "sold" })
      .select("shareNumber")
      .sort({ shareNumber: 1 })
      .lean();

    // Fetch company settings for receipt header
    const settings = await Settings.findOne()
      .select("siteTitle logo contactPhone contactEmail contactAddress")
      .lean();

    res.json({
      purchase,
      shareNumbers: slots.map((s) => s.shareNumber),
      company: {
        siteTitle: (settings as any)?.siteTitle ?? "",
        logo: (settings as any)?.logo ?? "",
        contactPhone: (settings as any)?.contactPhone ?? "",
        contactEmail: (settings as any)?.contactEmail ?? "",
        contactAddress: (settings as any)?.contactAddress ?? "",
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /purchase/:purchaseId/installments/:installmentId/receipt
export const getInstallmentReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { purchaseId, installmentId } = req.params;

    const purchase = await Purchase.findById(purchaseId)
      .populate("userId", "name username phone")
      .populate("shareId", "title cashPrice image")
      .lean();
    if (!purchase) return res.status(404).json({ message: "Purchase not found" });

    const isOwner = purchase.userId && (purchase.userId as any)._id?.toString() === req.user!._id.toString();
    const isStaff = ["superadmin", "admin", "staff"].includes(req.user!.role);
    if (!isOwner && !isStaff) return res.status(403).json({ message: "Forbidden" });

    const installment = await InstallmentPayment.findById(installmentId).lean();
    if (!installment) return res.status(404).json({ message: "Installment not found" });

    if (installment.status !== "approved")
      return res.status(400).json({ message: "Receipt only available for approved installments" });

    const settings = await Settings.findOne()
      .select("siteTitle logo contactPhone contactEmail contactAddress")
      .lean();

    res.json({
      purchase,
      installment,
      company: {
        siteTitle: (settings as any)?.siteTitle ?? "",
        logo: (settings as any)?.logo ?? "",
        contactPhone: (settings as any)?.contactPhone ?? "",
        contactEmail: (settings as any)?.contactEmail ?? "",
        contactAddress: (settings as any)?.contactAddress ?? "",
      },
    });
  } catch (err) {
    next(err);
  }
};

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
