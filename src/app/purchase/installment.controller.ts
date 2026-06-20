import { Request, Response, NextFunction } from "express";
import { Purchase } from "./model";
import { InstallmentPayment } from "./installment.model";
import { Share } from "../share/model";
import { calculateCertificateStatus, calculateTotalPayable } from "./service";
import { Certificate } from "../certificate/model";
import { Wallet, TransactionLog } from "../wallet/model";
import { User } from "../user/model";
import { distributeInstallmentPaymentCommission } from "./commissions";
import { CompanyLedger } from "../ledger/model";

const findOrCreateWallet = async (userId: string) => {
  return await Wallet.findOne({ userId });
};

export const createInstallmentPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { installmentNo, amount, senderAccount, transactionId } = req.body;
    const purchase = await Purchase.findById(req.params.purchaseId).populate("shareId", "installment");
    if (!purchase) {
      return res.status(404).json({ message: "Purchase not found" });
    }
    if (purchase.userId.toString() !== req.user!._id.toString()) {
      return res.status(403).json({ message: "Forbidden" });
    }
    if (purchase.paymentType !== "installment") {
      return res.status(400).json({
        message: "This purchase is not installment type",
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
      message: "Installment payment submitted",
      payment,
    });
  } catch (err) {
    next(err);
  }
};

export const getInstallmentSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const purchase = await Purchase.findById(req.params.purchaseId).lean();
    if (!purchase)
      return res.status(404).json({ message: "Purchase not found" });

    if (purchase.userId.toString() !== req.user!._id.toString())
      return res.status(403).json({ message: "Forbidden" });

    if (purchase.paymentType !== "installment")
      return res.status(400).json({ message: "Not an installment purchase" });

    const totalInstallments: number = purchase.installmentCount ?? 0;
    const perInstallment: number = purchase.installmentAmount ?? 0;

    const allPayments = await InstallmentPayment.find({ purchaseId: purchase._id })
      .sort({ installmentNo: 1, createdAt: 1 }).lean();

    const approvedCount = allPayments.filter((p) => p.status === "approved").length;
    const totalPayable = (purchase.downPayment ?? 0) + totalInstallments * perInstallment;
    const amountRemaining = Math.max(0, totalPayable - purchase.amountPaid);

    res.json({
      totalInstallments,
      completed: approvedCount,
      remaining: Math.max(0, totalInstallments - approvedCount),
      perInstallment,
      amountPaid: purchase.amountPaid,
      amountRemaining,
      payments: allPayments,
    });
  } catch (err) { next(err); }
};

export const getInstallmentsByPurchase = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const purchase = await Purchase.findById(req.params.purchaseId).select("userId");
    if (!purchase) {
      return res.status(404).json({ message: "Purchase not found" });
    }

    const isOwner = purchase.userId.toString() === req.user!._id.toString();
    const isAdmin = ["superadmin", "admin", "staff"].includes(req.user!.role);
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
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
      return res.status(400).json({ message: "Invalid status" });
    }
    if (status === "rejected" && !String(reviewNote ?? "").trim()) {
      return res.status(400).json({
        message: "Rejection reason is required",
      });
    }

    const payment = await InstallmentPayment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: "Installment not found" });
    }
    if (payment.status !== "pending") {
      return res.status(400).json({ message: "Already reviewed" });
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

        // Installment commission via snapshot
        try {
          await distributeInstallmentPaymentCommission(purchase._id.toString(), payment.amount);
        } catch (e) { console.error("Installment commission error:", e); }

        // Ledger: inflow for this installment payment
        await CompanyLedger.create({
          date: new Date(),
          type: "installment_received",
          amount: payment.amount,
          relatedId: payment._id,
          relatedModel: "InstallmentPayment",
          userId: purchase.userId,
          note: `Installment #${payment.installmentNo} approved — purchase ${purchase._id}`,
        }).catch(() => {});
      }
    }

    res.json({
      message: `Installment ${status}`,
      payment,
    });
  } catch (err) {
    next(err);
  }
};
