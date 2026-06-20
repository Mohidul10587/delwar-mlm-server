import { Request, Response, NextFunction } from "express";
import { Purchase } from "./model";
import { calculateCertificateStatus, calculateTotalPayable } from "./service";
import { Certificate } from "../certificate/model";
import { distributeCommissions } from "./commissions";
import { User } from "../user/model";
import { CompanyLedger } from "../ledger/model";

export const updatePurchaseStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { status, reviewNote } = req.body;
    if (!["approved", "rejected"].includes(status))
      return res.status(400).json({ message: "Invalid status" });
    if (status === "rejected" && !String(reviewNote ?? "").trim())
      return res.status(400).json({ message: "Rejection reason is required" });

    const purchase = await Purchase.findByIdAndUpdate(
      req.params.id,
      {
        status,
        reviewNote: String(reviewNote ?? "").trim(),
        reviewedBy: req.user!._id,
        reviewedAt: new Date(),
      },
      { new: true }
    );
    if (!purchase) {
      return res.status(404).json({ message: "Purchase not found" });
    }

    if (status === "approved" && !purchase.commissionProcessed) {
      // For cash: mark full amount as paid (downPayment + remainder)
      if (purchase.paymentType === "cash") {
        const fullAmount = purchase.snapshot.cashPrice * purchase.quantity;
        if (fullAmount > purchase.amountPaid) {
          purchase.amountPaid = fullAmount;
          await purchase.save();
        }
      }

      distributeCommissions((purchase._id as any).toString());

      await User.findByIdAndUpdate(purchase.userId, {
        $inc: { personalSharesCount: purchase.quantity },
      });

      // Ledger: record inflow for this purchase approval
      await CompanyLedger.create({
        date: new Date(),
        type: "purchase_received",
        amount: purchase.amountPaid,
        relatedId: purchase._id,
        relatedModel: "Purchase",
        userId: purchase.userId,
        note: `Purchase approved — ${purchase.snapshot?.shareTitle ?? ""} x${purchase.quantity}`,
      }).catch(() => { /* duplicate guard — skip */ });
    }

    const purchaseWithShare = await Purchase.findById(purchase._id)
      .populate("shareId", "cashPrice")
      .lean();
    if (purchaseWithShare) {
      const sharePrice = Number(
        (purchaseWithShare as any)?.shareId?.cashPrice ?? 0
      );
      const totalPayable = calculateTotalPayable(
        sharePrice,
        purchaseWithShare.quantity
      );
      const certificateStatus = calculateCertificateStatus({
        status: purchaseWithShare.status,
        paymentType: purchaseWithShare.paymentType,
        amountPaid: purchaseWithShare.amountPaid,
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
    }

    res.json({ message: `Purchase ${status}`, purchase });
  } catch (err) {
    next(err);
  }
};
