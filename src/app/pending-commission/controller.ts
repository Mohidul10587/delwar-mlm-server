import { Request, Response, NextFunction } from "express";
import { PendingCommission } from "./model";
import { Wallet, TransactionLog } from "../wallet/model";
import { CompanyLedger } from "../ledger/model";
import mongoose from "mongoose";

// ── Helper: atomic wallet credit (same pattern as commissions.ts) ─────────────

const atomicCreditWallet = async (
  userId: string,
  field: "manCommFromDownPayment" | "manCommFromInstallment",
  amount: number
) => {
  await Wallet.findOneAndUpdate(
    { userId },
    {
      $setOnInsert: {
        userId,
        totalBalance: 0,
        directCommissionBalance: 0,
        manCommFromDownPayment: 0,
        manCommFromInstallment: 0,
        salaryBalanceFromRanks: 0,
        cashbackBalance: 0,
        transferBalance: 0,
      },
    },
    { upsert: true }
  );
  const wallet = await Wallet.findOneAndUpdate(
    { userId },
    { $inc: { [field]: amount, totalBalance: amount } },
    { new: true }
  );
  if (!wallet) throw new Error(`Wallet not found for userId=${userId} after upsert`);
  return wallet;
};

// ── GET /pending-commission/batches ───────────────────────────────────────────
/**
 * প্রতিদিনের সব Pending Batch-এর তালিকা।
 * প্রতিটি batch-এ: batchId, batchDate, totalCommissions count, totalAmount, status summary।
 * Super Admin Panel-এ দেখানো হবে।
 */
export const getPendingBatches = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const batches = await PendingCommission.aggregate([
      {
        $group: {
          _id: "$batchId",
          batchDate: { $first: "$batchDate" },
          totalCommissions: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
          pendingCount: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          releasedCount: {
            $sum: { $cond: [{ $eq: ["$status", "released"] }, 1, 0] },
          },
          pendingAmount: {
            $sum: {
              $cond: [{ $eq: ["$status", "pending"] }, "$amount", 0],
            },
          },
        },
      },
      { $sort: { batchDate: -1 } },
    ]);

    // Enrich each batch with status label
    const enriched = batches.map((b) => ({
      batchId: b._id,
      batchDate: b.batchDate,
      totalCommissions: b.totalCommissions,
      totalAmount: b.totalAmount,
      pendingCount: b.pendingCount,
      releasedCount: b.releasedCount,
      pendingAmount: b.pendingAmount,
      isFullyReleased: b.pendingCount === 0,
    }));

    res.json({ batches: enriched });
  } catch (err) {
    next(err);
  }
};

// ── GET /pending-commission/batches/:batchId ──────────────────────────────────
/**
 * নির্দিষ্ট Batch-এর সব Pending Commission গুলো দেখান (ইউজার তথ্য সহ)।
 */
export const getBatchDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { batchId } = req.params;

    const commissions = await PendingCommission.find({ batchId })
      .populate("userId", "name username phone")
      .populate("purchaseId", "snapshot quantity paymentType")
      .sort({ createdAt: 1 })
      .lean();

    const totalAmount = commissions.reduce((s, c) => s + c.amount, 0);
    const pendingAmount = commissions
      .filter((c) => c.status === "pending")
      .reduce((s, c) => s + c.amount, 0);

    res.json({
      batchId,
      commissions,
      totalCommissions: commissions.length,
      totalAmount,
      pendingAmount,
      isFullyReleased: pendingAmount === 0,
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /pending-commission/batches/:batchId/release ─────────────────────────
/**
 * Super Admin কোনো Batch Release করলে:
 * 1. Batch-এর সব Pending কমিশন সংশ্লিষ্ট ইউজারদের Balance-এ যোগ হবে।
 * 2. প্রতিটি কমিশনের জন্য TransactionLog এবং CompanyLedger entry তৈরি হবে।
 * 3. কমিশনের স্ট্যাটাস Pending → Released হবে।
 */
export const releaseBatch = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { batchId } = req.params;
    const releasedBy = req.user!._id;

    // সব pending কমিশন লোড করো এই batch-এর
    const pendingCommissions = await PendingCommission.find({
      batchId,
      status: "pending",
    }).lean();

    if (pendingCommissions.length === 0) {
      return res.status(400).json({
        message: "No pending commissions found in this batch (already released or empty)",
      });
    }

    const releasedAt = new Date();
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (const commission of pendingCommissions) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          const walletField =
            commission.type === "down_payment_managerial"
              ? "manCommFromDownPayment"
              : "manCommFromInstallment";

          // 1. Wallet credit
          const wallet = await atomicCreditWallet(
            commission.userId.toString(),
            walletField,
            commission.amount
          );

          // 2. Transaction log
          const tx = await TransactionLog.create({
            userId: commission.userId,
            type: "managerial_commission",
            amount: commission.amount,
            balanceAfter:
              commission.type === "down_payment_managerial"
                ? wallet.manCommFromDownPayment
                : wallet.manCommFromInstallment,
            relatedPurchaseId: commission.purchaseId,
            note: commission.note,
          });

          // 3. Company ledger
          await CompanyLedger.create({
            date: releasedAt,
            type: "commission_paid",
            amount: commission.amount,
            relatedId: tx._id,
            relatedModel: "TransactionLog",
            userId: commission.userId,
            note: `[Batch Release: ${batchId}] ${commission.note}`,
          });

          // 4. Mark as released
          await PendingCommission.findByIdAndUpdate(commission._id, {
            $set: {
              status: "released",
              releasedAt,
              releasedBy,
            },
          });
        });

        successCount++;
      } catch (err) {
        failCount++;
        const errMsg = err instanceof Error ? err.message : String(err);
        errors.push(
          `commissionId=${commission._id.toString()}: ${errMsg}`
        );
        console.error(
          `[BATCH RELEASE ERROR] Failed to release commissionId=${commission._id}:`,
          err
        );
      } finally {
        await session.endSession();
      }
    }

    res.json({
      message: `Batch ${batchId} release complete. Released: ${successCount}, Failed: ${failCount}`,
      batchId,
      successCount,
      failCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /pending-commission/my ────────────────────────────────────────────────
/**
 * (Optional) কোনো ইউজার তার নিজের pending/released commission দেখতে পারবে।
 */
export const getMyPendingCommissions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!._id;
    const { status } = req.query;

    const filter: Record<string, any> = { userId };
    if (status === "pending" || status === "released") {
      filter.status = status;
    }

    const commissions = await PendingCommission.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    const totalPending = commissions
      .filter((c) => c.status === "pending")
      .reduce((s, c) => s + c.amount, 0);

    res.json({ commissions, totalPending });
  } catch (err) {
    next(err);
  }
};
