import { Request, Response, NextFunction } from "express";
import { Purchase } from "./model";
import { InstallmentPayment } from "./installment.model";
import { calculateCertificateStatus, calculateTotalPayable } from "./service";
import { Certificate } from "../certificate/model";
import { Wallet, TransactionLog } from "../wallet/model";
import { User } from "../user/model";
import { distributeInstallmentPaymentCommission } from "./commissions";
import { CompanyLedger } from "../ledger/model";
import { isTransactionIdUsed } from "../../utils/isTransactionIdUsed";
import { checkAndGrantInstallmentReward } from "../../utils/rewardUtils";

// Fix D-06: findOrCreateWallet replaced by inline findOne (wallet must exist by this point)
const getWallet = async (userId: string) => {
  return await Wallet.findOne({ userId });
};

export const createInstallmentPayment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      installmentNo,
      amount,
      senderAccount,
      transactionId,
      paymentMethod,
      receiptImage,
    } = req.body;
    const purchase = await Purchase.findById(req.params.purchaseId).populate(
      "projectId",
      "installment"
    );
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
    if (purchase.status !== "approved") {
      return res.status(400).json({
        message: "Cannot submit installment for a non-approved purchase",
      });
    }

    // Fix V-03: validate installmentNo
    const instNo = parseInt(String(installmentNo), 10);
    if (!Number.isInteger(instNo) || instNo < 1) {
      return res.status(400).json({ message: "Invalid installment number" });
    }

    // Fix F-09: check transactionId uniqueness for installments
    if (!transactionId || !String(transactionId).trim()) {
      return res.status(400).json({ message: "Transaction ID is required" });
    }
    const duplicate = await isTransactionIdUsed(String(transactionId).trim());
    if (duplicate) {
      return res
        .status(400)
        .json({ message: "This transaction ID has already been used" });
    }

    // Validate payment method
    const resolvedPaymentMethod = paymentMethod ?? "cash";
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

    // Validate amount
    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0" });
    }

    const payment = await InstallmentPayment.create({
      purchaseId: purchase._id,
      userId: req.user!._id,
      installmentNo: instNo,
      amount: parsedAmount,
      senderAccount,
      transactionId: String(transactionId).trim(),
      paymentMethod: resolvedPaymentMethod,
      receiptImage: receiptImage ?? null,
    });

    res.status(201).json({
      message: "Installment payment submitted",
      payment,
    });
  } catch (err) {
    next(err);
  }
};

export const getInstallmentSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const purchase = await Purchase.findById(req.params.purchaseId).lean();
    if (!purchase)
      return res.status(404).json({ message: "Purchase not found" });

    const isOwner = purchase.userId.toString() === req.user!._id.toString();
    const isStaff = ["superadmin", "admin", "staff"].includes(req.user!.role);
    if (!isOwner && !isStaff)
      return res.status(403).json({ message: "Forbidden" });

    if (purchase.paymentType !== "installment")
      return res.status(400).json({ message: "Not an installment purchase" });

    const totalInstallments: number = purchase.installmentCount ?? 0;
    const perInstallment: number = purchase.installmentAmount ?? 0;

    const allPayments = await InstallmentPayment.find({
      purchaseId: purchase._id,
    })
      .sort({ installmentNo: 1, createdAt: 1 })
      .lean();

    const approvedCount = allPayments.filter(
      (p) => p.status === "approved"
    ).length;
    const totalPayable =
      (purchase.downPayment ?? 0) + totalInstallments * perInstallment;
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
  } catch (err) {
    next(err);
  }
};

export const getPendingInstallments = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const payments = await InstallmentPayment.find({ status: "pending" })
      .sort({ createdAt: 1 })
      .populate("userId", "name username phone")
      .populate("purchaseId", "snapshot quantity")
      .lean();
    res.json({ payments });
  } catch (err) {
    next(err);
  }
};

export const getInstallmentsByPurchase = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const purchase = await Purchase.findById(req.params.purchaseId).select(
      "userId"
    );
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

export const updateInstallmentStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { status, reviewNote } = req.body as {
      status: "approved" | "rejected";
      reviewNote?: string;
    };
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
      // Fix F-04: use atomic $inc to avoid race condition on amountPaid
      const purchase = await Purchase.findByIdAndUpdate(
        payment.purchaseId,
        { $inc: { amountPaid: payment.amount } },
        { new: true }
      ).populate("projectId", "cashPrice installment commissions");

      if (purchase) {
        const share = purchase.projectId as any;
        const projectPrice = Number(share?.cashPrice ?? 0);
        const totalPayable = calculateTotalPayable(
          projectPrice,
          purchase.quantity
        );
        const certificateStatus = calculateCertificateStatus({
          status: purchase.status,
          paymentType: purchase.paymentType,
          amountPaid: purchase.amountPaid,
          totalPayable,
        });

        await Certificate.findOneAndUpdate(
          { purchaseId: purchase._id },
          {
            status: certificateStatus,
            issuedAt: certificateStatus === "issued" ? new Date() : undefined,
          },
          { upsert: true, new: true }
        );

        // Installment commission via snapshot
        try {
          await distributeInstallmentPaymentCommission(
            purchase._id.toString(),
            payment.amount,
            payment.installmentNo
          );
        } catch (e) {
          console.error("[COMMISSION ERROR] Installment commission error:", e);
        }

        // Fix E-02: Ledger — inflow for this installment payment (log failure, don't swallow)
        const buyer = await User.findById(purchase.userId)
          .select("name username")
          .lean();
        const buyerName = (buyer as any)?.name ?? "";
        const buyerUsername = (buyer as any)?.username ?? "";
        try {
          await CompanyLedger.create({
            date: new Date(),
            type: "installment_received",
            amount: payment.amount,
            relatedId: payment._id,
            relatedModel: "InstallmentPayment",
            userId: purchase.userId,
            note: `Installment #${payment.installmentNo} received — ${
              purchase.snapshot?.shareTitle ?? ""
            } — Buyer: ${buyerName} (@${buyerUsername}), ৳${payment.amount.toLocaleString()}`,
          });
        } catch (ledgerErr) {
          console.error(
            `[LEDGER ERROR] installment_received for paymentId=${payment._id}:`,
            ledgerErr
          );
        }

        await TransactionLog.create({
          userId: purchase.userId,
          type: "installment_received",
          amount: payment.amount,
          balanceAfter: 0,
          note: `Installment #${payment.installmentNo} approved — ${
            purchase.snapshot?.shareTitle ?? ""
          }, ৳${payment.amount.toLocaleString()}`,
          relatedPurchaseId: purchase._id,
        }).catch((err) => {
          console.error(
            `[TXLOG ERROR] installment_received log failed for paymentId=${payment._id}:`,
            err
          );
        });

        // Check and grant installment completion reward (non-critical)
        try {
          await checkAndGrantInstallmentReward(
            purchase._id.toString(),
            purchase.userId.toString()
          );
        } catch (rewardErr) {
          console.error(
            `[REWARD ERROR] installment reward check failed for purchaseId=${purchase._id}:`,
            rewardErr
          );
        }
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
