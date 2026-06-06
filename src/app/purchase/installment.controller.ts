import { Request, Response, NextFunction } from "express";
import { Purchase } from "./model";
import { InstallmentPayment } from "./installment.model";
import { Share } from "../share/model";
import { calculateCertificateStatus, calculateTotalPayable } from "./service";
import { Certificate } from "../certificate/model";
import { Wallet, TransactionLog } from "../wallet/model";
import { User } from "../user/model";

const findOrCreateWallet = async (userId: string) => {
  return await Wallet.findOne({ userId });
};

export const createInstallmentPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { installmentNo, amount, senderAccount, transactionId } = req.body;
    const purchase = await Purchase.findById(req.params.purchaseId).populate("shareId", "installment");
    if (!purchase) {
      return res.status(404).json({ message: { en: "Purchase not found", bn: "ক্রয় পাওয়া যায়নি" } });
    }
    if (purchase.userId.toString() !== req.user!._id.toString()) {
      return res.status(403).json({ message: { en: "Forbidden", bn: "অনুমতি নেই" } });
    }
    if (purchase.paymentType !== "installment") {
      return res.status(400).json({
        message: { en: "This purchase is not installment type", bn: "এটি কিস্তি ভিত্তিক ক্রয় নয়" },
      });
    }

    const payment = await InstallmentPayment.create({
      purchaseId: purchase._id,
      userId: req.user!._id,
      installmentNo: Number(installmentNo),
      amount: Number(amount),
      senderAccount,
      transactionId,
    });

    res.status(201).json({
      message: { en: "Installment payment submitted", bn: "কিস্তির পেমেন্ট জমা হয়েছে" },
      payment,
    });
  } catch (err) {
    next(err);
  }
};

export const getInstallmentSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const purchase = await Purchase.findById(req.params.purchaseId)
      .populate("shareId", "installment cashPrice")
      .lean();
    if (!purchase)
      return res.status(404).json({ message: { en: "Purchase not found", bn: "ক্রয় পাওয়া যায়নি" } });

    if (purchase.userId.toString() !== req.user!._id.toString())
      return res.status(403).json({ message: { en: "Forbidden", bn: "অনুমতি নেই" } });

    if (purchase.paymentType !== "installment")
      return res.status(400).json({ message: { en: "Not an installment purchase", bn: "এটি কিস্তি ভিত্তিক ক্রয় নয়" } });

    const share = purchase.shareId as any;
    const totalInstallments: number = share?.installment?.totalInstallments ?? 0;
    const perInstallment: number = share?.installment?.perInstallment ?? 0;

    const approvedPayments = await InstallmentPayment.find({
      purchaseId: purchase._id,
      status: "approved",
    }).sort({ installmentNo: 1 }).lean();

    const completed = approvedPayments.length;
    const remaining = Math.max(0, totalInstallments - completed);

    res.json({
      totalInstallments,
      completed,
      remaining,
      perInstallment,
      amountPaid: purchase.amountPaid,
      payments: approvedPayments,
    });
  } catch (err) { next(err); }
};

export const getInstallmentsByPurchase = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const purchase = await Purchase.findById(req.params.purchaseId).select("userId");
    if (!purchase) {
      return res.status(404).json({ message: { en: "Purchase not found", bn: "ক্রয় পাওয়া যায়নি" } });
    }

    const isOwner = purchase.userId.toString() === req.user!._id.toString();
    const isAdmin = ["superadmin", "admin", "staff"].includes(req.user!.role);
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: { en: "Forbidden", bn: "অনুমতি নেই" } });
    }

    const payments = await InstallmentPayment.find({ purchaseId: purchase._id })
      .sort({ installmentNo: 1, createdAt: 1 })
      .lean();

    res.json({ payments });
  } catch (err) {
    next(err);
  }
};

export const updateInstallmentStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, reviewNote } = req.body as { status: "approved" | "rejected"; reviewNote?: string };
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: { en: "Invalid status", bn: "অবৈধ স্ট্যাটাস" } });
    }
    if (status === "rejected" && !String(reviewNote ?? "").trim()) {
      return res.status(400).json({
        message: { en: "Rejection reason is required", bn: "প্রত্যাখ্যানের কারণ লিখতে হবে" },
      });
    }

    const payment = await InstallmentPayment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: { en: "Installment not found", bn: "কিস্তির রেকর্ড পাওয়া যায়নি" } });
    }
    if (payment.status !== "pending") {
      return res.status(400).json({ message: { en: "Already reviewed", bn: "ইতোমধ্যে রিভিউ করা হয়েছে" } });
    }

    payment.status = status;
    payment.reviewNote = String(reviewNote ?? "").trim();
    payment.reviewedBy = req.user!._id;
    payment.reviewedAt = new Date();
    await payment.save();

    if (status === "approved") {
      const purchase = await Purchase.findById(payment.purchaseId).populate("shareId", "cashPrice installment commissions");
      if (purchase) {
        purchase.amountPaid += payment.amount;
        await purchase.save();

        const share = purchase.shareId as any;
        const sharePrice = Number(share?.cashPrice ?? 0);
        const totalPayable = calculateTotalPayable(sharePrice, purchase.quantity);
        const certificateStatus = calculateCertificateStatus({
          status: purchase.status,
          paymentType: purchase.paymentType,
          amountPaid: purchase.amountPaid,
          totalPayable,
        });

        await Certificate.findOneAndUpdate(
          { purchaseId: purchase._id },
          { status: certificateStatus, issuedAt: certificateStatus === "issued" ? new Date() : undefined },
          { upsert: true, new: true }
        );

        // Installment commission to referrer
        try {
          const buyer = await User.findById(purchase.userId).select("generationAncestors");
          const referrerId = buyer?.generationAncestors?.[0]?.userId;
          if (referrerId && share?.directSalesCommissionForInstallmentSell) {
            const rate = share.directSalesCommissionForInstallmentSell;
            const commission = (rate / 100) * payment.amount;
            if (commission > 0) {
              const wallet = await findOrCreateWallet(referrerId.toString());
              if (wallet) {
                wallet.balance += commission;
                await wallet.save();
                await TransactionLog.create({ userId: referrerId, type: "installment_commission", amount: commission, balanceAfter: wallet.balance, relatedPurchaseId: purchase._id, note: `Installment #${payment.installmentNo} commission` });
              }
            }
          }
        } catch (e) { console.error("Installment commission error:", e); }
      }
    }

    res.json({
      message: { en: `Installment ${status}`, bn: `কিস্তি ${status === "approved" ? "অনুমোদিত" : "প্রত্যাখ্যাত"}` },
      payment,
    });
  } catch (err) {
    next(err);
  }
};
