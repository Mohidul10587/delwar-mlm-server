import { Request, Response, NextFunction } from "express";
import { Purchase } from "./model";
import { calculateCertificateStatus, calculateTotalPayable } from "./service";
import { Certificate } from "../certificate/model";
import { distributeCommissions } from "./commissions";

export const updatePurchaseStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, reviewNote } = req.body;
    if (!["approved", "rejected"].includes(status))
      return res.status(400).json({ message: { en: "Invalid status", bn: "অবৈধ স্ট্যাটাস" } });
    if (status === "rejected" && !String(reviewNote ?? "").trim())
      return res.status(400).json({ message: { en: "Rejection reason is required", bn: "প্রত্যাখ্যানের কারণ লিখতে হবে" } });

    const purchase = await Purchase.findByIdAndUpdate(
      req.params.id,
      { status, reviewNote: String(reviewNote ?? "").trim(), reviewedBy: req.user!._id, reviewedAt: new Date() },
      { new: true }
    );
    if (!purchase)
      return res.status(404).json({ message: { en: "Purchase not found", bn: "ক্রয় পাওয়া যায়নি" } });

    const purchaseWithShare = await Purchase.findById(purchase._id).populate("shareId", "cashPrice").lean();
    if (purchaseWithShare) {
      const sharePrice = Number((purchaseWithShare as any)?.shareId?.cashPrice ?? 0);
      const totalPayable = calculateTotalPayable(sharePrice, purchaseWithShare.quantity);
      const certificateStatus = calculateCertificateStatus({
        status: purchaseWithShare.status,
        paymentType: purchaseWithShare.paymentType,
        amountPaid: purchaseWithShare.amountPaid,
        totalPayable,
      });
      await Certificate.findOneAndUpdate(
        { purchaseId: purchase._id },
        { status: certificateStatus, issuedAt: certificateStatus === "issued" ? new Date() : undefined },
        { upsert: true, new: true }
      );
    }

    if (status === "approved" && !purchase.commissionProcessed)
      distributeCommissions((purchase._id as any).toString());

    res.json({
      message: { en: `Purchase ${status}`, bn: `ক্রয় ${status === "approved" ? "অনুমোদিত" : "বাতিল"}` },
      purchase,
    });
  } catch (err) { next(err); }
};
