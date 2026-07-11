import { Request, Response, NextFunction } from "express";
import { Purchase } from "./model";
import { calculateCertificateStatus, calculateTotalPayable } from "./service";
import { Certificate } from "../certificate/model";
import { distributeCommissions } from "./commissions";
import { User } from "../user/model";
import { CompanyLedger } from "../ledger/model";
import { ShareSlot } from "../project/shareSlot.model";
import { Project } from "../project/model";
import { recalcUserRank } from "../rank/controller";
// [DISABLED] import { checkAndGrantOneTimeReward } from "../../utils/rewardUtils";

// ── Share allocation helpers ──────────────────────────────────────────────────

/**
 * Fix F-01: Allocates share slots atomically to prevent race conditions.
 * Each slot is updated one-by-one with a status=available guard so that
 * two concurrent approvals cannot grab the same slot.
 */
async function allocateShares(
  purchase: any
): Promise<{ error: string } | null> {
  // Find available slot IDs first
  const available = await ShareSlot.find({
    projectId: purchase.projectId,
    status: "available",
  })
    .sort({ shareNumber: 1 })
    .limit(purchase.quantity)
    .select("_id")
    .lean();

  if (available.length < purchase.quantity) {
    return {
      error: `Only ${available.length} share slot(s) available, ${purchase.quantity} required`,
    };
  }

  // Fix F-01: Atomically claim each slot — only succeeds if status is still "available"
  let claimed = 0;
  const claimedIds: any[] = [];
  for (const slot of available) {
    const updated = await ShareSlot.findOneAndUpdate(
      { _id: slot._id, status: "available" }, // atomic guard
      {
        $set: {
          status: "sold",
          userId: purchase.userId,
          purchaseId: purchase._id,
        },
      },
      { new: true }
    );
    if (updated) {
      claimed++;
      claimedIds.push(slot._id);
    }
  }

  if (claimed < purchase.quantity) {
    // Roll back whatever we already claimed
    if (claimedIds.length > 0) {
      await ShareSlot.updateMany(
        { _id: { $in: claimedIds } },
        { $set: { status: "available", userId: null, purchaseId: null } }
      );
    }
    return {
      error: `Only ${claimed} slot(s) could be allocated (concurrent conflict). Please retry.`,
    };
  }

  return null;
}

/**
 * Reclaims all sold share slots belonging to a purchase.
 */
async function reclaimPurchaseShares(purchaseId: any): Promise<number> {
  const result = await ShareSlot.updateMany(
    { purchaseId, status: "sold" },
    {
      $set: {
        status: "reclaimed",
        reclaimedAt: new Date(),
        userId: null,
        purchaseId: null,
      },
    }
  );
  return result.modifiedCount;
}

/**
 * After a purchase approval allocates slots, check whether all slots for the
 * parent share are now sold. If so, automatically set projectStatus = "complete".
 *
 * Rules (per requirement):
 * - Full/cash purchase: slots are allocated on purchase approval → check here.
 * - Installment purchase: down payment approval = purchase approval → same path.
 * - Only "sold" slots count; "available" and "reclaimed" do not.
 */
async function checkAndCompleteShare(projectId: any): Promise<void> {
  try {
    const share = await Project.findById(projectId)
      .select("totalShares projectStatus")
      .lean();
    if (!share || share.projectStatus === "complete") return;
    if (!share.totalShares || share.totalShares <= 0) return;

    const soldCount = await ShareSlot.countDocuments({
      projectId,
      status: "sold",
    });
    if (soldCount >= share.totalShares) {
      await Project.findByIdAndUpdate(projectId, {
        $set: { projectStatus: "complete" },
      });
    }
  } catch (err) {
    // Non-critical — log and continue; do not block the approval response
    console.error(
      `[SHARE COMPLETE] checkAndCompleteShare failed for projectId=${projectId}:`,
      err
    );
  }
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
    if (
      status === "approved" &&
      !wasAlreadyApproved &&
      purchase.paymentType === "cash"
    ) {
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
        $inc: { personalPurchaseCount: purchase.quantity },
      });

      // Step 4b — Recalc buyer's own rank (Rank 2 depends on personal purchase count)
      await recalcUserRank(purchase.userId.toString());

      // Step 5 — Fix P-02: await commission distribution so errors are caught
      if (!purchase.commissionProcessed) {
        await distributeCommissions((purchase._id as any).toString());
      }

      // Step 5b — One-time reward for cash purchases (full payment at once)
      // [DISABLED] if (purchase.paymentType === "cash") {
      //   await checkAndGrantOneTimeReward(
      //     (purchase._id as any).toString(),
      //     purchase.userId.toString(),
      //     purchase.amountPaid
      //   );
      // }

      // Step 6 — Ledger entry
      const buyer = await User.findById(purchase.userId)
        .select("name username")
        .lean();
      const buyerName = (buyer as any)?.name ?? "";
      const buyerUsername = (buyer as any)?.username ?? "";
      try {
        await CompanyLedger.create({
          date: new Date(),
          type: "purchase_received",
          amount: purchase.amountPaid,
          relatedId: purchase._id,
          relatedModel: "Purchase",
          userId: purchase.userId,
          note: `Purchase approved — ${purchase.snapshot?.shareTitle ?? ""} x${
            purchase.quantity
          } [${
            purchase.paymentType
          }] — Buyer: ${buyerName} (@${buyerUsername}), ৳${purchase.amountPaid.toLocaleString()}`,
        });
      } catch (ledgerErr) {
        // Fix E-02: log ledger failures — do not silently swallow
        console.error(
          `[LEDGER ERROR] Failed to create purchase_received ledger for purchaseId=${purchase._id}:`,
          ledgerErr
        );
      }

      // Step 7 — Auto-complete share if all slots are now sold
      await checkAndCompleteShare(purchase.projectId);
    }

    // Step 8 — Update certificate status
    const purchaseWithShare = await Purchase.findById(purchase._id)
      .populate("projectId", "cashPrice")
      .lean();
    if (purchaseWithShare) {
      const projectPrice = Number(
        (purchaseWithShare as any)?.projectId?.cashPrice ?? 0
      );
      const totalPayable = calculateTotalPayable(
        projectPrice,
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
