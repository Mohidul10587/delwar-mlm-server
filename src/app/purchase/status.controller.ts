import { Request, Response, NextFunction } from "express";
import { Purchase } from "./model";
import { calculateCertificateStatus, calculateTotalPayable, calculateTotalPayableFromPurchase } from "./service";
import { round2 } from "../../utils/walletUtils";
import { Certificate } from "../certificate/model";
import { distributeCommissions } from "./commissions";
import { User } from "../user/model";
import { CompanyLedger } from "../ledger/model";
import { ShareSlot } from "../project/shareSlot.model";
import { Project } from "../project/model";
import { recalcUserRank } from "../rank/controller";
import { Wallet, TransactionLog } from "../wallet/model";
import { sendPurchaseApprovalSms } from "../../utils/sms";

// ── Share allocation helpers ──────────────────────────────────────────────────

/**
 * Fix F-01: Allocates share slots atomically to prevent race conditions.
 * Each slot is updated one-by-one with a status=available guard so that
 * two concurrent approvals cannot grab the same slot.
 */
async function allocateShares(
  purchase: any
): Promise<{ error: string } | null> {
  // Find available slot IDs first — reserved slots are intentionally excluded
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

  // Atomically claim the selected slots in one guarded update. MongoDB checks
  // the status predicate while applying the update, so concurrent approvals
  // cannot take a slot that was already sold.
  const candidateIds = available.map((slot) => slot._id);
  const claimResult = await ShareSlot.updateMany(
    { _id: { $in: candidateIds }, status: "available" },
    {
      $set: {
        status: "sold",
        userId: purchase.userId,
        purchaseId: purchase._id,
      },
    }
  );
  const claimed = claimResult.modifiedCount;

  if (claimed < purchase.quantity) {
    // Roll back whatever we already claimed
    if (claimed > 0) {
      await ShareSlot.updateMany(
        // Only roll back slots claimed by this purchase; never touch a slot
        // concurrently allocated by somebody else.
        { _id: { $in: candidateIds }, purchaseId: purchase._id, status: "sold" },
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

    // Count only sold slots — reserved slots are NOT considered sold and
    // should never trigger auto-complete.
    const soldCount = await ShareSlot.countDocuments({
      projectId,
      status: "sold",
    });

    // Count non-reserved slots to determine if all purchasable slots are sold
    const reservedCount = await ShareSlot.countDocuments({
      projectId,
      status: "reserved",
    });
    const purchasableTotal = share.totalShares - reservedCount;

    if (purchasableTotal > 0 && soldCount >= purchasableTotal) {
      await Project.findByIdAndUpdate(projectId, {
        $set: { projectStatus: "complete" },
      });
    }
  } catch (err) {
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

    // ── Fix: Atomically claim the purchase for review ─────────────────────────
    // findOneAndUpdate with status: "pending" guard ensures only one concurrent
    // admin can approve/reject — a second request will find no document matching
    // the filter and get a clear "already reviewed" error instead of double-processing.
    const purchase = await Purchase.findOneAndUpdate(
      { _id: req.params.id, status: "pending" },
      {
        $set: {
          status,
          reviewNote: String(reviewNote ?? "").trim(),
          reviewedBy: req.user!._id,
          reviewedByInfo: { name: req.user!.name, role: req.user!.role },
          reviewedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!purchase) {
      const exists = await Purchase.exists({ _id: req.params.id });
      return res.status(exists ? 400 : 404).json({
        message: exists
          ? "This purchase has already been reviewed"
          : "Purchase not found",
      });
    }

    // ── Rejection path ────────────────────────────────────────────────────────
    if (status === "rejected") {
      // Refund reserved cashback if any
      if (purchase.cashbackAmount > 0 && !purchase.cashbackRefunded) {
        const wallet = await Wallet.findOneAndUpdate(
          { userId: purchase.userId },
          {
            $inc: {
              cashbackBalance: purchase.cashbackAmount,
              totalBalance: purchase.cashbackAmount,
            },
          },
          { new: true, upsert: true }
        );
        await Purchase.findByIdAndUpdate(purchase._id, {
          $set: { cashbackRefunded: true },
        });
        await TransactionLog.create({
          userId: purchase.userId,
          type: "cashback_payment_refund",
          amount: purchase.cashbackAmount,
          balanceAfter: wallet.totalBalance,
          relatedPurchaseId: purchase._id,
          note: `Cashback refunded for rejected purchase ${purchase._id.toString()}`,
        });
      }

      // Update certificate status
      await Certificate.findOneAndUpdate(
        { purchaseId: purchase._id },
        { status: "cancelled" },
        { upsert: true }
      );

      return res.json({ message: "Purchase rejected", purchase });
    }

    // ── Approval path ─────────────────────────────────────────────────────────

    // Step 1 — Allocate share slots atomically
    const allocationError = await allocateShares(purchase);
    if (allocationError) {
      // Roll back the status change so the purchase can be retried
      await Purchase.findByIdAndUpdate(purchase._id, {
        $set: { status: "pending", reviewNote: "", reviewedBy: null, reviewedByInfo: null, reviewedAt: null },
      });
      return res.status(400).json({ message: allocationError.error });
    }

    // Step 2 — For cash: amountPaid is already set correctly at purchase creation
    // (discounted full price × qty). No update needed.

    // Respond immediately so the admin UI is not blocked by downstream tasks
    res.json({ message: "Purchase approved", purchase });

    // ── Post-approval side-effects (non-blocking after response) ─────────────

    // SMS notification
    try {
      const user = await User.findById(purchase.userId).select("phone").lean();
      if (user && (user as any).phone) {
        await sendPurchaseApprovalSms(
          (user as any).phone,
          purchase._id.toString(),
          purchase.amountPaid,
          purchase.snapshot?.shareTitle || "Product"
        );
      }
    } catch (smsError) {
      console.error("Failed to send purchase approval SMS:", smsError);
    }

    // Step 3 — personalPurchaseCount + rank recalc
    await User.findByIdAndUpdate(purchase.userId, {
      $inc: { personalPurchaseCount: purchase.quantity },
    });
    await recalcUserRank(purchase.userId.toString());

    // Step 4 — Commission distribution
    // commissionProcessed flag is the idempotency guard — set to true atomically
    // inside distributeCommissions before any wallet writes, so a retry is safe.
    if (!purchase.commissionProcessed) {
      await distributeCommissions((purchase._id as any).toString());
    }

    // Step 5 — Auto cashback (Incentive Bonus) for cash purchases
    // Base = snap.effectiveDownPayment — discount was applied once at purchase creation.
    // No discount is re-applied here.
    if (
      purchase.paymentType === "cash" &&
      (purchase.snapshot?.cashbackPercent ?? 0) > 0
    ) {
      try {
        const cashbackPct = purchase.snapshot.cashbackPercent;
        const effectiveDP = round2(purchase.snapshot.effectiveDownPayment ?? 0);
        const cashbackAmt = round2((cashbackPct / 100) * effectiveDP);

        if (cashbackAmt > 0) {
          const updatedWallet = await Wallet.findOneAndUpdate(
            { userId: purchase.userId },
            { $inc: { cashbackBalance: cashbackAmt, totalBalance: cashbackAmt } },
            { new: true, upsert: true }
          );
          await TransactionLog.create({
            userId: purchase.userId,
            type: "cashback",
            amount: cashbackAmt,
            balanceAfter: updatedWallet!.totalBalance,
            relatedPurchaseId: purchase._id,
            note: `Incentive bonus ${cashbackPct}% on effective down payment ৳${effectiveDP.toLocaleString()} — ${purchase.snapshot.shareTitle} x${purchase.quantity} — ৳${cashbackAmt.toLocaleString()}`,
          });
          try {
            await CompanyLedger.create({
              date: new Date(),
              type: "cashback_paid",
              amount: cashbackAmt,
              relatedId: purchase._id,
              relatedModel: "Purchase",
              userId: purchase.userId,
              note: `Auto cashback ${cashbackPct}% for purchaseId=${(purchase._id as any).toString()}`,
            });
          } catch (ledgerErr) {
            console.error(
              `[LEDGER ERROR] cashback_paid for purchaseId=${(purchase._id as any).toString()}:`,
              ledgerErr
            );
          }
        }
      } catch (cashbackErr) {
        console.error(
          `[CASHBACK ERROR] Auto cashback failed for purchaseId=${(purchase._id as any).toString()}:`,
          cashbackErr
        );
      }
    }

    // Step 6 — Company ledger inflow entry
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
        note: `Purchase approved — ${purchase.snapshot?.shareTitle ?? ""} x${purchase.quantity} [${purchase.paymentType}] — Buyer: ${buyerName} (@${buyerUsername}), ৳${purchase.amountPaid.toLocaleString()}`,
      });
    } catch (ledgerErr) {
      console.error(
        `[LEDGER ERROR] Failed to create purchase_received ledger for purchaseId=${purchase._id}:`,
        ledgerErr
      );
    }

    // Step 7 — Auto-complete share if all slots sold
    await checkAndCompleteShare(purchase.projectId);

    // Step 8 — Update certificate status
    const purchaseWithShare = await Purchase.findById(purchase._id)
      .populate("projectId", "cashPrice installmentPrice")
      .lean();
    if (purchaseWithShare) {
      const totalPayable = calculateTotalPayableFromPurchase(purchaseWithShare);
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

// ── Retry Commission Distribution ─────────────────────────────────────────────
// Handles the case where commissionProcessed was set to true atomically but the
// server crashed before wallet writes completed.  Admin can call this endpoint
// to safely re-run commission distribution for any approved purchase where
// commissionProcessed is still false (i.e. the flag rollback in the catch block
// of distributeCommissions succeeded) OR where the flag is true but the admin
// suspects a partial failure.
//
// distributeCommissions itself is idempotent via the
//   findOneAndUpdate({ commissionProcessed: false })
// guard — if commissionProcessed is already true it exits immediately, so
// calling this endpoint on a fully-processed purchase is a safe no-op.
export const retryCommission = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const purchase = await Purchase.findById(req.params.id).lean();
    if (!purchase)
      return res.status(404).json({ message: "Purchase not found" });
    if (purchase.status !== "approved")
      return res
        .status(400)
        .json({ message: "Commission retry only available for approved purchases" });

    if (purchase.commissionProcessed) {
      return res.json({ message: "Commission already processed — no action taken" });
    }

    await distributeCommissions((purchase._id as any).toString());
    res.json({ message: "Commission distribution retried successfully" });
  } catch (err) {
    next(err);
  }
};
