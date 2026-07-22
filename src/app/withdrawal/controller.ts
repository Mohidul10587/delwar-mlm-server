import { Request, Response, NextFunction } from "express";
import { Withdrawal } from "./model";
import { Wallet, TransactionLog } from "../wallet/model";
import { Branch } from "../branch/model";

// All wallet balances except cashback are withdrawable. Loan is subtracted
// from their total before a withdrawal can be approved.
const WITHDRAWABLE_FIELDS = [
  "directCommissionBalance",
  "manCommFromDownPayment",
  "manCommFromInstallment",
  "salaryBalanceFromRanks",
  "transferBalance",
  "fixedMonthlySalaryForAdminOnly",
  "expenseReimbursementBalance",
  "rewardBalanceFromInstallment",
] as const;

export const createWithdrawal = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      amount,
      method,
      // bank
      bankAccount,
      // mobile
      mobileType,
      mobileNumber,
      mobileAccountName,
      // cash / branch
      branchId,
      // legacy
      accountDetails,
    } = req.body;

    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0)
      return res.status(400).json({ message: "Amount must be greater than 0" });

    // ── Validate per method ──────────────────────────────────────────────
    if (method === "bank") {
      if (!bankAccount?.bankName || !bankAccount?.accountNumber)
        return res
          .status(400)
          .json({ message: "Bank account details required" });
    } else if (method === "mobile") {
      if (!mobileType || !mobileNumber)
        return res
          .status(400)
          .json({ message: "Mobile type and number required" });
    } else if (method === "cash" || method === "branch") {
      if (!branchId)
        return res
          .status(400)
          .json({ message: "Branch is required for cash withdrawal" });
    } else {
      // legacy methods: bkash / nagad / rocket / bank (old)
      if (!accountDetails)
        return res.status(400).json({ message: "Account details required" });
    }

    // ── Resolve branch name ──────────────────────────────────────────────
    let branchName: string | undefined;
    const isCash = method === "cash" || method === "branch";
    if (isCash && branchId) {
      const branchDoc = await Branch.findById(branchId).lean();
      if (!branchDoc)
        return res.status(404).json({ message: "Selected branch not found" });
      branchName = (branchDoc as any).name;
    }

    // ── Balance check ────────────────────────────────────────────────────
    const wallet = await Wallet.findOne({ userId: req.user!._id });
    if (!wallet) return res.status(404).json({ message: "Wallet not found" });

    const loanAmount = wallet.loanAmount ?? 0;
    const withdrawableBalance =
      WITHDRAWABLE_FIELDS.reduce(
        (total, field) => total + (wallet[field] ?? 0),
        0
      ) - loanAmount;

    if (withdrawableBalance < amt)
      return res.status(400).json({ message: "Insufficient balance" });

    // ── Compute per-field deductions ─────────────────────────────────────
    let remaining = amt;
    const deductions: Record<string, number> = {};
    for (const field of WITHDRAWABLE_FIELDS) {
      if (remaining <= 0) break;
      const available = (wallet[field] as number) ?? 0;
      const deduct = Math.min(available, remaining);
      if (deduct > 0) {
        deductions[field] = deduct;
        remaining -= deduct;
      }
    }

    const incPayload: Record<string, number> = { totalBalance: -amt };
    for (const [field, deduct] of Object.entries(deductions)) {
      incPayload[field] = -deduct;
    }

    const updated = await Wallet.findOneAndUpdate(
      {
        _id: wallet._id,
        // totalBalance includes cashback, but cashback cannot be withdrawn.
        totalBalance: {
          $gte: amt + loanAmount + (wallet.cashbackBalance ?? 0),
        },
      },
      { $inc: incPayload },
      { new: true }
    );
    if (!updated)
      return res.status(400).json({ message: "Insufficient balance" });

    // ── Build note & accountDetails string ───────────────────────────────
    let noteDetail: string;
    let legacyAccountDetails = accountDetails ?? "";

    if (method === "bank") {
      noteDetail = `Bank: ${bankAccount.bankName} — ${bankAccount.accountNumber}`;
      legacyAccountDetails = `${bankAccount.bankName} — ${bankAccount.accountName} — ${bankAccount.accountNumber}`;
    } else if (method === "mobile") {
      noteDetail = `${(mobileType as string).toUpperCase()}: ${mobileNumber}`;
      legacyAccountDetails = `${(
        mobileType as string
      ).toUpperCase()} — ${mobileNumber}`;
    } else if (isCash) {
      noteDetail = `Branch: ${branchName}`;
      legacyAccountDetails = "";
    } else {
      noteDetail = `${(method as string).toUpperCase()}: ${accountDetails}`;
    }

    await TransactionLog.create({
      userId: req.user!._id,
      type: "withdrawal",
      amount: amt,
      balanceAfter: updated.totalBalance,
      note: `Withdrawal request — ৳${amt.toLocaleString()} via ${noteDetail}`,
    });

    // ── Create withdrawal document ───────────────────────────────────────
    const withdrawal = await Withdrawal.create({
      userId: req.user!._id,
      amount: amt,
      method,
      // bank
      bankAccount: method === "bank" ? bankAccount : undefined,
      // mobile
      mobileType: method === "mobile" ? mobileType : undefined,
      mobileNumber: method === "mobile" ? mobileNumber : undefined,
      mobileAccountName: method === "mobile" ? mobileAccountName : undefined,
      // cash
      branch: isCash ? branchName : undefined,
      branchId: isCash ? branchId : undefined,
      // legacy
      accountDetails: legacyAccountDetails,
      deductionBreakdown: deductions,
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

    // Branch manager sees only withdrawals routed to their branch
    let filter: Record<string, any> = {};
    if (req.user!.role === "branch_manager") {
      const branch = await Branch.findOne({ managerId: req.user!._id }).lean();
      if (!branch) {
        return res.json({ withdrawals: [], total: 0, page, pages: 0 });
      }
      filter = { branchId: (branch as any)._id };
    }

    const [withdrawals, total] = await Promise.all([
      Withdrawal.find(filter)
        .populate("userId", "name username phone")
        .populate("branchId", "name address")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Withdrawal.countDocuments(filter),
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

    // A branch manager can review only withdrawals routed to their own branch.
    // Admin and superadmin reviewers retain access to all requests.
    if (req.user!.role === "branch_manager") {
      const branch = await Branch.findOne({ managerId: req.user!._id })
        .select("_id")
        .lean();
      if (
        !branch ||
        withdrawal.branchId?.toString() !== branch._id.toString()
      ) {
        return res.status(403).json({
          message: "You can only review withdrawal requests for your branch",
        });
      }
    }

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

        const isCashMethod =
          withdrawal.method === "cash" || withdrawal.method === "branch";
        const restoredWallet = await Wallet.findById(wallet._id).lean();
        await TransactionLog.create({
          userId: withdrawal.userId,
          type: "withdrawal_rejected",
          amount: withdrawal.amount,
          balanceAfter: (restoredWallet as any)?.totalBalance ?? 0,
          note: `Withdrawal rejected — ৳${withdrawal.amount.toLocaleString()} via ${
            withdrawal.method
          }${
            isCashMethod
              ? ` (${withdrawal.branch})`
              : withdrawal.method === "mobile"
              ? ` (${withdrawal.mobileType?.toUpperCase()}: ${
                  withdrawal.mobileNumber
                })`
              : withdrawal.bankAccount
              ? ` (${withdrawal.bankAccount.bankName} — ${withdrawal.bankAccount.accountNumber})`
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
      const isCashMethod =
        withdrawal.method === "cash" || withdrawal.method === "branch";
      const dest = isCashMethod
        ? `Branch: ${withdrawal.branch}`
        : withdrawal.method === "mobile"
        ? `${withdrawal.mobileType?.toUpperCase()}: ${withdrawal.mobileNumber}`
        : withdrawal.bankAccount
        ? `Bank: ${withdrawal.bankAccount.bankName} — ${withdrawal.bankAccount.accountNumber}`
        : `${withdrawal.method.toUpperCase()}: ${withdrawal.accountDetails}`;
    }

    res.json({ message: `Withdrawal ${status}`, withdrawal });
  } catch (err) {
    next(err);
  }
};
