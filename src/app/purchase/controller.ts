import { Request, Response, NextFunction } from "express";
import { Purchase } from "./model";
import { InstallmentPayment } from "./installment.model";
import { Project } from "../project/model";
import { User } from "../user/model";
import { Settings } from "../settings/model";
import { calculateCertificateStatus, calculateTotalPayable, calculateTotalPayableFromPurchase } from "./service";
import { Certificate } from "../certificate/model";
import { ShareSlot } from "../project/shareSlot.model";
import { Wallet, TransactionLog } from "../wallet/model";
import { generateCustomId } from "../../utils/generateId";
import { generateReceiptPng } from "./generateReceipt";
import { round2 } from "../../utils/walletUtils";

// Helper — build slotsByPurchase map from a list of purchaseIds
async function fetchSlotsByPurchase(
  purchaseIds: any[]
): Promise<Record<string, string[]>> {
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
export const createPurchase = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      projectId,
      quantity,
      paymentType,
      downPayment,
      installmentCount,
      senderAccount,
      transactionId,
      buyerInfo,
      paymentMethod,
      receiptImage,
      cashbackAmount,
      branchId,
    } = req.body;

    // Fix V-01: validate quantity
    const qty = parseInt(String(quantity), 10);
    if (!Number.isInteger(qty) || qty < 1) {
      return res
        .status(400)
        .json({ message: "Quantity must be a positive integer" });
    }

    // Fix F-10: check transactionId uniqueness before creating purchase
    // Cash payments don't require a transaction ID
    const resolvedPaymentMethod = paymentMethod ?? "cash";
    const isCashPayment = resolvedPaymentMethod === "cash";

    if (!isCashPayment) {
      if (!transactionId || !String(transactionId).trim()) {
        return res.status(400).json({ message: "Transaction ID is required" });
      }
      const { isTransactionIdUsed } = await import(
        "../../utils/isTransactionIdUsed"
      );
      const duplicate = await isTransactionIdUsed(String(transactionId).trim());
      if (duplicate) {
        return res
          .status(400)
          .json({ message: "This transaction ID has already been used" });
      }
    }

    // Validate payment method
    if (!["cash", "bank", "mobile_banking"].includes(resolvedPaymentMethod)) {
      return res
        .status(400)
        .json({
          message:
            "Invalid payment method. Must be cash, bank, or mobile_banking",
        });
    }

    // Receipt image is required for bank and mobile_banking payments
    if (
      ["bank", "mobile_banking"].includes(resolvedPaymentMethod) &&
      !receiptImage
    ) {
      return res
        .status(400)
        .json({
          message:
            "Receipt image is required for bank or mobile banking payments",
        });
    }

    if (!["cash", "installment"].includes(paymentType)) {
      return res.status(400).json({ message: "Invalid payment type" });
    }

    // Fetch share and buyer in parallel — both are needed and independent
    const [share, buyer] = await Promise.all([
      Project.findById(projectId),
      User.findById(req.user!._id).select("name phone nominee nominee2"),
    ]);

    if (!share) return res.status(404).json({ message: "Share not found" });

    if (!share.isActive)
      return res
        .status(400)
        .json({ message: "This share is not available for purchase" });

    // Check that enough available (non-reserved) slots exist before accepting
    // the purchase request — gives user an early clear error instead of failing
    // silently at approval time.
    const availableSlotCount = await ShareSlot.countDocuments({
      projectId: share._id,
      status: "available",
    });
    if (availableSlotCount < qty) {
      return res.status(400).json({
        message: `Only ${availableSlotCount} share slot(s) available for purchase. ${qty} requested.`,
      });
    }

    // Fix F-11: validate down payment range for installment.
    // Frontend sends the raw (pre-discount) per-unit down payment.
    // Backend applies the discount itself — no reverse-calculation needed.
    if (paymentType === "installment") {
      const rawDpPerUnit = Number(downPayment);
      if (
        isNaN(rawDpPerUnit) ||
        rawDpPerUnit < share.minDownPayment ||
        rawDpPerUnit > share.maxDownPayment
      ) {
        return res.status(400).json({
          message: `Down payment per unit must be between ৳${share.minDownPayment.toLocaleString()} and ৳${share.maxDownPayment.toLocaleString()}`,
        });
      }
      // Fix F-14: validate installment count range
      const ic = parseInt(String(installmentCount), 10);
      if (
        !Number.isInteger(ic) ||
        ic < share.minInstallments ||
        ic > share.maxInstallments
      ) {
        return res.status(400).json({
          message: `Installment count must be between ${share.minInstallments} and ${share.maxInstallments}`,
        });
      }
    }

    // Build resolvedBuyerInfo:
    // - If frontend sends buyerInfo.nominees array → use it (new behaviour)
    // - If frontend sends legacy buyerInfo.nominee/nominee2 → normalise into nominees array
    // - If no buyerInfo sent → fall back to user's stored nominees
    let resolvedBuyerInfo: any = null;
    if (buyerInfo) {
      const incomingNominees: any[] = [];

      if (Array.isArray(buyerInfo.nominees) && buyerInfo.nominees.length > 0) {
        // New path: nominees array provided
        for (const n of buyerInfo.nominees) {
          if (n && typeof n === "object") {
            incomingNominees.push({
              name: String(n.name ?? "").trim(),
              relation: String(n.relation ?? "").trim(),
              phone: String(n.phone ?? "").trim(),
              nid: n.nid ? String(n.nid).trim() : undefined,
              image: n.image ? String(n.image).trim() : undefined,
            });
          }
        }
      } else {
        // Legacy path: nominee / nominee2 fixed fields
        if (buyerInfo.nominee?.name) incomingNominees.push(buyerInfo.nominee);
        if (buyerInfo.nominee2?.name) incomingNominees.push(buyerInfo.nominee2);
      }

      resolvedBuyerInfo = {
        name: buyerInfo.name ?? buyer?.name,
        phone: buyerInfo.phone ?? buyer?.phone,
        nominees: incomingNominees.length ? incomingNominees : undefined,
        // Keep legacy fields as well for backward compat with older receipt renders
        nominee: incomingNominees[0] ?? undefined,
        nominee2: incomingNominees[1] ?? undefined,
      };
    } else if (buyer) {
      // Fall back to user's stored nominees
      const fallbackNominees: any[] = [];
      if (buyer.nominee?.name) fallbackNominees.push(buyer.nominee);
      if (buyer.nominee2?.name) fallbackNominees.push(buyer.nominee2);
      resolvedBuyerInfo = {
        name: buyer.name,
        phone: buyer.phone,
        nominees: fallbackNominees.length ? fallbackNominees : undefined,
        nominee: buyer.nominee ?? undefined,
        nominee2: buyer.nominee2 ?? undefined,
      };
    }

    // ── Payment calculations ──────────────────────────────────────────────────
    //
    // Frontend sends the raw (pre-discount) per-unit down payment.
    // Backend applies the discount here so all money math lives in one place.
    //
    // Cash purchase example:
    //   cashPrice=100, maxDownPayment=20, cashDiscount=10%
    //   discountedDPPerUnit = round2(20 × 0.90) = 18
    //   remainingPerUnit    = cashPrice - maxDownPayment = 100 - 20 = 80
    //   totalPayable        = (18 + 80) × qty = 98 × qty
    //   amountPaid          = totalPayable  (cash = full payment upfront)
    //
    // Installment purchase example:
    //   installmentPrice=120, rawDPPerUnit chosen by user=30, installmentDiscount=5%
    //   discountedDPPerUnit = round2(30 × 0.95) = 28.50
    //   totalPayable        = installmentPrice × qty = 120 × qty
    //   amountPaid          = discountedDPPerUnit × qty (only down payment now)

    const rawDPPerUnit = round2(Number(downPayment)); // raw per-unit, validated above

    let totalPayable: number;
    let resolvedDP: number; // total down payment for all qty (discounted)
    let effectiveDownPayment: number; // discount applied once — used for all commission/bonus calc

    if (paymentType === "cash") {
      const cashDiscountPct = share.cashDiscount ?? 0;
      const discountedDPPerUnit = round2(share.maxDownPayment * (1 - cashDiscountPct / 100));
      const remainingPerUnit = round2(Math.max(0, share.cashPrice - share.maxDownPayment));
      const totalPerUnit = round2(discountedDPPerUnit + remainingPerUnit);
      totalPayable = round2(totalPerUnit * qty);
      resolvedDP = totalPayable; // cash = paid in full upfront
      // EDP: maxDownPayment with discount applied once
      effectiveDownPayment = round2(discountedDPPerUnit * qty);
    } else {
      const installmentDiscountPct = share.installmentDiscount ?? 0;
      const discountedDPPerUnit = round2(rawDPPerUnit * (1 - installmentDiscountPct / 100));
      const discountAmountPerUnit = round2(rawDPPerUnit - discountedDPPerUnit);
      resolvedDP = round2(discountedDPPerUnit * qty);
      // totalPayable = installmentPrice × qty minus the discount applied to down payment
      totalPayable = round2((share.installmentPrice ?? share.cashPrice) * qty - discountAmountPerUnit * qty);
      // EDP: user's chosen raw DP with discount applied once
      effectiveDownPayment = resolvedDP;
    }

    const resolvedCount = paymentType === "cash" ? 1 : Number(installmentCount);
    const resolvedInstallmentAmount =
      paymentType === "cash"
        ? 0
        : round2(Math.ceil((totalPayable - resolvedDP) / resolvedCount));
    const amountPaid = resolvedDP;

    const requestedCashbackAmount = round2(Number(cashbackAmount ?? 0));
    const currentPaymentAmount = amountPaid;
    const maxCashbackAmount = round2(Math.min(totalPayable * 0.1, currentPaymentAmount));
    if (
      !Number.isFinite(requestedCashbackAmount) ||
      requestedCashbackAmount < 0 ||
      requestedCashbackAmount > maxCashbackAmount
    ) {
      return res.status(400).json({
        message: `Cashback payment cannot exceed ৳${maxCashbackAmount.toLocaleString()}`,
      });
    }
    const otherPaymentAmount = currentPaymentAmount - requestedCashbackAmount;
    if (otherPaymentAmount <= 0) {
      return res.status(400).json({
        message: "A remaining amount must be paid using another payment method",
      });
    }

    const settings = await Settings.findOne().lean();
    const ranks = (settings?.ranks ?? []) as any[];
    const snapshot = {
      shareTitle: share.title,
      shareImage: share.images?.[0] ?? "",
      cashPrice: share.cashPrice,
      installmentPrice: share.installmentPrice ?? share.cashPrice,
      minDownPayment: share.minDownPayment,
      maxDownPayment: share.maxDownPayment,
      cashDiscount: share.cashDiscount ?? 0,
      installmentDiscount: share.installmentDiscount ?? 0,
      effectiveDownPayment,
      directSaleCommissionValue: share.directSaleCommissionValue,
      downPaymentGenerationRates: share.downPaymentGenerationRates,
      installmentCommissionRate: share.installmentCommissionRate,
      installmentGenerationRates: share.installmentGenerationRates ?? [],
      cashbackPercent: share.cashbackPercent ?? 0,
      rankQualification: ranks.map((r: any) => ({
        rankName: r.name,
        order: r.order,
        minNetworkSalesAmount: r.minNetworkSalesAmount ?? 0,
      })),
      salaryRules: ranks
        .filter((r: any) => r.salary?.amount > 0)
        .map((r: any) => ({
          rankName: r.name,
          amount: r.salary.amount,
          salaryDurationMonths: r.salary.salaryDurationMonths,
          minMonthlySalesQty: r.salary.minMonthlySalesQty,
          minTotalPersonalPurchaseQtyForSalary:
            r.salary.minTotalPersonalPurchaseQtyForSalary,
        })),
    };

    const purchase = await Purchase.create({
      paymentId: await generateCustomId("PAY"),
      userId: req.user!._id,
      projectId,
      quantity: qty,
      paymentType,
      paymentMethod: resolvedPaymentMethod,
      cashbackAmount: requestedCashbackAmount,
      otherPaymentAmount,
      receiptImage: receiptImage ?? null,
      downPayment: resolvedDP,
      installmentCount: resolvedCount,
      installmentAmount: resolvedInstallmentAmount,
      amountPaid,
      senderAccount: isCashPayment ? "" : senderAccount ?? "",
      // Cash payments have no transaction ID — generate a unique placeholder so
      // the sparse unique index does not reject multiple cash purchases.
      transactionId: isCashPayment
        ? `CASH-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        : String(transactionId).trim(),
      buyerInfo: resolvedBuyerInfo,
      snapshot,
      branchId: isCashPayment && branchId ? branchId : null,
    });

    // Reserve cashback immediately so it cannot be used by another pending
    // purchase. Rejected purchases refund this exact amount in status.controller.
    if (requestedCashbackAmount > 0) {
      const wallet = await Wallet.findOneAndUpdate(
        {
          userId: req.user!._id,
          cashbackBalance: { $gte: requestedCashbackAmount },
        },
        {
          $inc: {
            cashbackBalance: -requestedCashbackAmount,
            totalBalance: -requestedCashbackAmount,
          },
        },
        { new: true }
      );
      if (!wallet) {
        await Purchase.findByIdAndDelete(purchase._id);
        return res.status(400).json({ message: "Insufficient cashback balance" });
      }

      await TransactionLog.create({
        userId: req.user!._id,
        type: "cashback_payment",
        amount: requestedCashbackAmount,
        balanceAfter: wallet.totalBalance,
        relatedPurchaseId: purchase._id,
        note: `Cashback used for ${share.title} x${qty}`,
      });
    }

    await Certificate.create({
      certificateId: await generateCustomId("CERT"),
      userId: req.user!._id,
      purchaseId: purchase._id,
      projectId,
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
export const getPurchases = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // H-05 fix: pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 30;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.status) filter.status = req.query.status;

    const [purchases, total] = await Promise.all([
      Purchase.find(filter)
        .populate("userId", "name username phone customerId")
        .populate("projectId", "title cashPrice installment")
        .populate("branchId", "name")
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
      ? await InstallmentPayment.find({
          purchaseId: { $in: installmentPurchaseIds },
        }).lean()
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
      // Use snapshot-aware calculation: installment purchases use installmentPrice,
      // cash purchases use cashPrice. Previously cashPrice was used for both,
      // causing wrong totalPayable and amountRemaining for installment purchases.
      const totalPayable = calculateTotalPayableFromPurchase(purchase);
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
      if (
        purchase.paymentType !== "installment" ||
        purchase.status === "pending"
      )
        return base;
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
    res.json({
      purchases: enriched,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
};

// GET /purchase/branch — branch manager gets purchases attached to their branch
export const getBranchPurchases = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const managerId = req.user!._id;

    // Find the branch managed by this user
    const { Branch } = await import("../branch/model");
    const branch = await Branch.findOne({ managerId }).lean();
    if (!branch)
      return res.status(404).json({ message: "No branch assigned to this manager" });

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 30;
    const skip = (page - 1) * limit;

    const filter: any = { branchId: branch._id };
    if (req.query.status) filter.status = req.query.status;

    const [purchases, total] = await Promise.all([
      Purchase.find(filter)
        .populate("userId", "name username phone customerId")
        .populate("projectId", "title cashPrice installment")
        .populate("branchId", "name")
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

    const approvedIds = purchases.filter((p) => p.status === "approved").map((p) => p._id);
    const slotsByPurchase = await fetchSlotsByPurchase(approvedIds);

    const enriched = purchases.map((purchase) => {
      const totalPayable = calculateTotalPayableFromPurchase(purchase);
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

// GET /purchase/branch/:id  — branch manager gets a single purchase from their branch
export const getBranchPurchaseById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { Branch } = await import("../branch/model");
    const branch = await Branch.findOne({ managerId: req.user!._id }).lean();
    if (!branch)
      return res.status(404).json({ message: "No branch assigned to this manager" });

    const purchase = await Purchase.findOne({
      _id: req.params.id,
      branchId: branch._id,
    })
      .populate("userId", "name username phone customerId")
      .populate("projectId", "title cashPrice installment")
      .lean();

    if (!purchase)
      return res.status(404).json({ message: "Purchase not found" });

    const totalPayable = calculateTotalPayableFromPurchase(purchase);

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

// GET /purchase/:id  — staff gets a single purchase by id
export const getPurchaseById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const purchase = await Purchase.findById(req.params.id)
      .populate("userId", "name username phone customerId")
      .populate("projectId", "title cashPrice installmentPrice sharePrefix")
      .lean();
    if (!purchase)
      return res.status(404).json({ message: "Purchase not found" });

    const totalPayable = calculateTotalPayableFromPurchase(purchase);

    const slots = await ShareSlot.find({
      purchaseId: purchase._id,
      status: "sold",
    })
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

// GET /purchase/:id/receipt  — logged-in user (or staff) gets receipt for an approved purchase
export const getPurchaseReceipt = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const purchase = await Purchase.findById(req.params.id)
      .populate("userId", "name username phone customerId")
      .populate("projectId", "title cashPrice image")
      .populate("reviewedBy", "name username") // cashier / receiver
      .lean();

    if (!purchase)
      return res.status(404).json({ message: "Purchase not found" });

    // Only the owner or staff can access
    const isOwner =
      purchase.userId &&
      (purchase.userId as any)._id?.toString() === req.user!._id.toString();
    const isStaff = ["superadmin", "admin", "staff"].includes(req.user!.role);
    if (!isOwner && !isStaff)
      return res.status(403).json({ message: "Forbidden" });

    if (purchase.status !== "approved")
      return res
        .status(400)
        .json({ message: "Receipt only available for approved purchases" });

    // Fetch share slot numbers
    const slots = await ShareSlot.find({
      purchaseId: purchase._id,
      status: "sold",
    })
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
export const getInstallmentReceipt = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { purchaseId, installmentId } = req.params;

    const purchase = await Purchase.findById(purchaseId)
      .populate("userId", "name username phone customerId")
      .populate("projectId", "title cashPrice image")
      .lean();
    if (!purchase)
      return res.status(404).json({ message: "Purchase not found" });

    const isOwner =
      purchase.userId &&
      (purchase.userId as any)._id?.toString() === req.user!._id.toString();
    const isStaff = ["superadmin", "admin", "staff"].includes(req.user!.role);
    if (!isOwner && !isStaff)
      return res.status(403).json({ message: "Forbidden" });

    const installment = await InstallmentPayment.findById(installmentId)
      .populate("reviewedBy", "name username") // cashier / receiver
      .lean();
    if (!installment)
      return res.status(404).json({ message: "Installment not found" });

    if (installment.status !== "approved")
      return res
        .status(400)
        .json({ message: "Receipt only available for approved installments" });

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

export const getMyPurchases = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const purchases = await Purchase.find({ userId: req.user!._id })
      .populate("projectId", "title cashPrice installment image")
      .sort({ createdAt: -1 })
      .lean();

    const approvedIds = purchases
      .filter((p) => p.status === "approved")
      .map((p) => p._id);
    const slotsByPurchase = await fetchSlotsByPurchase(approvedIds);

    const enriched = purchases.map((purchase) => {
      const totalPayable = calculateTotalPayableFromPurchase(purchase);
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

// GET /purchase/:id/receipt/download — server-side PNG download for purchase receipt
export const downloadPurchaseReceipt = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const purchase = await Purchase.findById(req.params.id)
      .populate("userId", "name username phone customerId")
      .populate("projectId", "title cashPrice image")
      .populate("reviewedBy", "name username")
      .lean();

    if (!purchase)
      return res.status(404).json({ message: "Purchase not found" });

    const isOwner =
      purchase.userId &&
      (purchase.userId as any)._id?.toString() === req.user!._id.toString();
    const isStaff = ["superadmin", "admin", "staff"].includes(req.user!.role);
    if (!isOwner && !isStaff)
      return res.status(403).json({ message: "Forbidden" });

    if (purchase.status !== "approved")
      return res.status(400).json({ message: "Receipt only available for approved purchases" });

    const slots = await ShareSlot.find({ purchaseId: purchase._id, status: "sold" })
      .select("shareNumber")
      .sort({ shareNumber: 1 })
      .lean();

    const pngBuffer = await generateReceiptPng({
      purchase: purchase as any,
      shareNumbers: slots.map((s) => s.shareNumber),
    });

    res.set({
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="receipt-${purchase._id}.png"`,
      "Content-Length": pngBuffer.length,
      "Cache-Control": "no-store",
    });
    res.send(pngBuffer);
  } catch (err) {
    next(err);
  }
};

// GET /purchase/:purchaseId/installments/:installmentId/receipt/download
export const downloadInstallmentReceipt = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { purchaseId, installmentId } = req.params;

    const purchase = await Purchase.findById(purchaseId)
      .populate("userId", "name username phone customerId")
      .populate("projectId", "title cashPrice image")
      .lean();
    if (!purchase)
      return res.status(404).json({ message: "Purchase not found" });

    const isOwner =
      purchase.userId &&
      (purchase.userId as any)._id?.toString() === req.user!._id.toString();
    const isStaff = ["superadmin", "admin", "staff"].includes(req.user!.role);
    if (!isOwner && !isStaff)
      return res.status(403).json({ message: "Forbidden" });

    const installment = await InstallmentPayment.findById(installmentId)
      .populate("reviewedBy", "name username")
      .lean();
    if (!installment)
      return res.status(404).json({ message: "Installment not found" });

    if (installment.status !== "approved")
      return res.status(400).json({ message: "Receipt only available for approved installments" });

    const pngBuffer = await generateReceiptPng({
      purchase: purchase as any,
      installment: installment as any,
    });

    res.set({
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="receipt-inst-${installment._id}.png"`,
      "Content-Length": pngBuffer.length,
      "Cache-Control": "no-store",
    });
    res.send(pngBuffer);
  } catch (err) {
    next(err);
  }
};
