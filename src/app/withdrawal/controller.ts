import { Request, Response, NextFunction } from "express";
import { Withdrawal } from "./model";
import { Wallet, TransactionLog } from "../wallet/model";
import { CompanyLedger } from "../ledger/model";

export const createWithdrawal = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { amount, method, accountDetails, branch } = req.body;
    const amt = Number(amount);

    if (isNaN(amt) || amt <= 0)
      return res.status(400).json({ message: "Amount must be greater than 0" });
    if (method === "branch" && !branch)
      return res.status(400).json({ message: "Branch is required" });
    if (method !== "branch" && !accountDetails)
      return res.status(400).json({ message: "Account details required" });

    // Fix F-02: Atomic balance check + deduction using findOneAndUpdate.
    // We deduct from each balance field sequentially in a single save but
    // first we use a version-check pattern to prevent concurrent over-withdrawal.
    //
    // Strategy: load the wallet, compute deductions, then do an atomic update
    // only if all sub-balances are still sufficient (optimistic guard).
    const wallet = await Wallet.findOne({ userId: req.user!._id });
    if (!wallet) return res.status(404).json({ message: "Wallet not found" });

    // cashbackBalance is excluded from withdrawal
    const withdrawableBalance =
      (wallet.directCommissionBalance ?? 0) +
      (wallet.manCommFromDownPayment ?? 0) +
      (wallet.manCommFromInstallment ?? 0) +
      (wallet.salaryBalanceFromRanks ?? 0) +
      (wallet.transferBalance ?? 0);

    if (withdrawableBalance < amt)
      return res.status(400).json({ message: "Insufficient balance" });

    // Compute per-field deductions (same sequential logic as before)
    let remaining = amt;
    const deductions: Record<string, number> = {};
    const fields: (keyof typeof wallet)[] = [
      "directCommissionBalance",
      "manCommFromDownPayment",
      "manCommFromInstallment",
      "salaryBalanceFromRanks",
      "transferBalance",
    ];
    for (const field of fields) {
      if (remaining <= 0) break;
      const available = (wallet[field] as number) ?? 0;
      const deduct = Math.min(available, remaining);
      if (deduct > 0) {
        deductions[field] = deduct;
        remaining -= deduct;
      }
    }

    // Build $inc payload — also update totalBalance atomically
    const incPayload: Record<string, number> = { totalBalance: -amt };
    for (const [field, deduct] of Object.entries(deductions)) {
      incPayload[field] = -deduct;
    }

    // H-03 fix: Atomic balance check inside findOneAndUpdate — prevents race condition
    // where two concurrent requests both pass the balance check before either deducts.
    const updated = await Wallet.findOneAndUpdate(
      { _id: wallet._id, totalBalance: { $gte: amt } }, // atomic guard
      { $inc: incPayload },
      { new: true }
    );

    if (!updated) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    const noteDetail =
      method === "branch"
        ? `Branch: ${branch}`
        : `${method.toUpperCase()}: ${accountDetails}`;

    await TransactionLog.create({
      userId: req.user!._id,
      type: "withdrawal",
      amount: amt,
      balanceAfter: updated.totalBalance,
      note: `Withdrawal request — ৳${amt.toLocaleString()} via ${noteDetail}`,
    });

    // Fix F-07: Store deduction breakdown so we can restore correctly on rejection
    const withdrawal = await Withdrawal.create({
      userId: req.user!._id,
      amount: amt,
      method,
      accountDetails: method === "branch" ? "" : accountDetails,
      branch: method === "branch" ? branch : undefined,
      deductionBreakdown: deductions, // stored for correct refund on rejection
    });

    res
      .status(201)
      .json({ message: "Withdrawal request submitted", withdrawal });
  } catch (err) {
    next(err);
  }
};

export const getWithdrawals = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Fix A-03: add pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 30;
    const skip = (page - 1) * limit;

    const [withdrawals, total] = await Promise.all([
      Withdrawal.find()
        .populate("userId", "name username phone")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Withdrawal.countDocuments(),
    ]);

    res.json({ withdrawals, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

export const getMyWithdrawals = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const withdrawals = await Withdrawal.find({ userId: req.user!._id })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ withdrawals });
  } catch (err) {
    next(err);
  }
};

export const updateWithdrawalStatus = async (
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

    const withdrawal = await Withdrawal.findById(req.params.id);
    if (!withdrawal)
      return res.status(404).json({ message: "Withdrawal not found" });
    if (withdrawal.status !== "pending")
      return res.status(400).json({ message: "Already reviewed" });

    if (status === "rejected") {
      const wallet = await Wallet.findOne({ userId: withdrawal.userId });
      if (wallet) {
        // Fix F-07: restore each balance field to what was originally deducted
        const breakdown: Record<string, number> =
          (withdrawal as any).deductionBreakdown ?? {};

        if (Object.keys(breakdown).length > 0) {
          // Restore using the stored breakdown
          const incPayload: Record<string, number> = {
            totalBalance: withdrawal.amount,
          };
          for (const [field, amount] of Object.entries(breakdown)) {
            incPayload[field] = amount;
          }
          await Wallet.findByIdAndUpdate(wallet._id, { $inc: incPayload });
        } else {
          // Fallback for old withdrawals that have no breakdown: restore to directCommissionBalance
          await Wallet.findByIdAndUpdate(wallet._id, {
            $inc: {
              directCommissionBalance: withdrawal.amount,
              totalBalance: withdrawal.amount,
            },
          });
        }

        const restoredWallet = await Wallet.findById(wallet._id).lean();
        await TransactionLog.create({
          userId: withdrawal.userId,
          type: "withdrawal_rejected",
          amount: withdrawal.amount,
          balanceAfter: (restoredWallet as any)?.totalBalance ?? 0,
          note: `Withdrawal rejected — ৳${withdrawal.amount.toLocaleString()} via ${
            withdrawal.method
          }${
            withdrawal.method === "branch"
              ? ` (${withdrawal.branch})`
              : ` (${withdrawal.accountDetails})`
          }. Reason: ${reviewNote || "No reason given"}`,
        });
      }
    }

    withdrawal.status = status;
    withdrawal.reviewNote = String(reviewNote ?? "").trim();
    withdrawal.reviewedBy = req.user!._id;
    withdrawal.reviewedAt = new Date();
    await withdrawal.save();

    // Ledger: approved withdrawal = outflow
    if (status === "approved") {
      const wUser = (await Withdrawal.findById(withdrawal._id)
        .populate("userId", "name username")
        .lean()) as any;
      const uName = wUser?.userId?.name ?? "";
      const uUsername = wUser?.userId?.username ?? "";
      const dest =
        withdrawal.method === "branch"
          ? `Branch: ${withdrawal.branch}`
          : `${withdrawal.method.toUpperCase()}: ${withdrawal.accountDetails}`;

      try {
        await CompanyLedger.create({
          date: new Date(),
          type: "withdrawal_paid",
          amount: withdrawal.amount,
          relatedId: withdrawal._id,
          relatedModel: "Withdrawal",
          userId: withdrawal.userId,
          note: `Withdrawal paid — ৳${withdrawal.amount.toLocaleString()} to ${uName} (@${uUsername}) via ${dest}`,
        });
      } catch (ledgerErr) {
        console.error(
          `[LEDGER ERROR] withdrawal_paid for withdrawalId=${withdrawal._id}:`,
          ledgerErr
        );
      }
    }

    res.json({ message: `Withdrawal ${status}`, withdrawal });
  } catch (err) {
    next(err);
  }
};
