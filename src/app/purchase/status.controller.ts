import { Request, Response, NextFunction } from "express";
import { Purchase } from "./model";
import { calculateCertificateStatus, calculateTotalPayable } from "./service";
import { Certificate } from "../certificate/model";
import { distributeCommissions } from "./commissions";
import { User } from "../user/model";
import { CompanyLedger } from "../ledger/model";
import { ShareSlot } from "../share/shareSlot.model";

// ── Share allocation helpers ──────────────────────────────────────────────────

/**
 * Allocates available share slots to a purchase.
 * Returns error string if not enough available, otherwise null.
 */
async function allocateShares(purchase: any): Promise<{ error: string } | null> {
  const available = await ShareSlot.find({
    shareId: purchase.shareId,
    status: "available",
  })
    .sort({ shareNumber: 1 })
    .limit(purchase.quantity)
    .select("_id");

  if (available.length < purchase.quantity) {
    return { error: `Only ${available.length} share slot(s) available, ${purchase.quantity} required` };
  }

  await ShareSlot.updateMany(
    { _id: { $in: available.map((s) => s._id) } },
    { $set: { status: "sold", userId: purchase.userId, purchaseId: purchase._id } }
  );

  return null;
}

/**
 * Reclaims all sold share slots belonging to a purchase.
 * Returns number of slots reclaimed.
 */
async function reclaimPurchaseShares(purchaseId: any): Promise<number> {
  const result = await ShareSlot.updateMany(
    { purchaseId, status: "sold" },
    { $set: { status: "reclaimed", reclaimedAt: new Date(), userId: null, purchaseId: null } }
  );
  return result.modifiedCount;
}

// ── Update Purchase Status (Approve / Reject) ─────────────────────────────────

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

    const purchase = await Purchase.findById(req.params.id);
    if (!purchase)
      return res.status(404).json({ message: "Purchase not found" });

    const wasAlreadyApproved = purchase.status === "approved";

    // Step 1 — Allocate share slots (only on first approval)
    if (status === "approved" && !wasAlreadyApproved) {
      const allocationError = await allocateShares(purchase);
      if (allocationError) {
        return res.status(400).json({ message: allocationError.error });
      }
    }

    // Step 2 — For cash: mark full amount as paid
    if (status === "approved" && !wasAlreadyApproved && purchase.paymentType === "cash") {
      const fullAmount = purchase.snapshot.cashPrice * purchase.quantity;
      if (fullAmount > purchase.amountPaid) {
        purchase.amountPaid = fullAmount;
      }
    }

    // Step 3 — Save purchase status
    purchase.status = status as any;
    purchase.reviewNote = String(reviewNote ?? "").trim();
    purchase.reviewedBy = req.user!._id as any;
    purchase.reviewedAt = new Date();
    await purchase.save();

    // Respond immediately
    res.json({ message: `Purchase ${status}`, purchase });

    if (status === "approved" && !wasAlreadyApproved) {
      // Step 4 — User personal shares count
      await User.findByIdAndUpdate(purchase.userId, {
        $inc: { personalSharesCount: purchase.quantity },
      });

      // Step 5 — Distribute commissions
      if (!purchase.commissionProcessed) {
        distributeCommissions((purchase._id as any).toString());
      }

      // Step 6 — Ledger entry
      const buyer = await User.findById(purchase.userId).select("name username").lean();
      const buyerName = (buyer as any)?.name ?? "";
      const buyerUsername = (buyer as any)?.username ?? "";
      await CompanyLedger.create({
        date: new Date(),
        type: "purchase_received",
        amount: purchase.amountPaid,
        relatedId: purchase._id,
        relatedModel: "Purchase",
        userId: purchase.userId,
        note: `Purchase approved — ${purchase.snapshot?.shareTitle ?? ""} x${purchase.quantity} [${purchase.paymentType}] — Buyer: ${buyerName} (@${buyerUsername}), ৳${purchase.amountPaid.toLocaleString()}`,
      }).catch(() => {});
    }

    // Step 7 — Update certificate status
    const purchaseWithShare = await Purchase.findById(purchase._id)
      .populate("shareId", "cashPrice")
      .lean();
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
        {
          status: certificateStatus,
          issuedAt: certificateStatus === "issued" ? new Date() : undefined,
        },
        { upsert: true, new: true }
      );
    }
  } catch (err) {
    next(err);
  }
};

// ── Reclaim Shares (Installment Default) ─────────────────────────────────────

export const reclaimShares = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const purchase = await Purchase.findById(req.params.purchaseId);
    if (!purchase)
      return res.status(404).json({ message: "Purchase not found" });

    const reclaimed = await reclaimPurchaseShares(purchase._id);
    if (reclaimed === 0) {
      return res.status(404).json({
        message: "No sold share slots found for this purchase",
      });
    }

    res.json({
      message: `${reclaimed} share slot(s) reclaimed`,
      reclaimed,
    });
  } catch (err) {
    next(err);
  }
};
