import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { Wallet, TransactionLog } from "../wallet/model";
import { CompanyLedger } from "../ledger/model";
import { Settings } from "../settings/model";
import { User } from "../user/model";

// Fields that can be drawn from during a transfer, in deduction priority order.
// cashbackBalance and loanAmount are intentionally excluded.
const TRANSFERABLE_FIELDS = [
  "directCommissionBalance",
  "manCommFromDownPayment",
  "manCommFromInstallment",
  "salaryBalanceFromRanks",
  "fixedMonthlySalaryForAdminOnly",
  "expenseReimbursementBalance",
  "transferBalance",
] as const;

type TransferableField = (typeof TRANSFERABLE_FIELDS)[number];

// Build $inc update that drains fields in priority order up to `needed` total.
function buildDeductionInc(wallet: Record<string, number>, needed: number) {
  const inc: Record<string, number> = {};
  let remaining = needed;

  for (const field of TRANSFERABLE_FIELDS) {
    if (remaining <= 0) break;
    const available = wallet[field] ?? 0;
    if (available <= 0) continue;
    const take = Math.min(available, remaining);
    inc[field] = -take;
    remaining -= take;
  }

  if (remaining > 0) return null; // not enough across all fields
  inc.totalBalance = -needed;
  return inc;
}

export const sendTransfer = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const senderId = req.user!._id.toString();
    const { receiverUsername, amount, password } = req.body;

    if (!receiverUsername || !amount) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ message: "receiverUsername and amount are required" });
    }

    if (!password) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ message: "Password is required to confirm transfer" });
    }

    // Verify password
    const senderUser = await User.findById(senderId).select("password").lean();
    if (!senderUser) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Sender not found" });
    }
    const isPasswordValid = await bcrypt.compare(
      String(password),
      senderUser.password
    );
    if (!isPasswordValid) {
      await session.abortTransaction();
      return res
        .status(401)
        .json({ message: "Incorrect password. Transfer cancelled." });
    }

    const transferAmount = Number(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Amount must be greater than 0" });
    }

    // Find receiver
    const receiver = await User.findOne({ username: receiverUsername }).lean();
    if (!receiver) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Receiver not found" });
    }
    if (receiver._id.toString() === senderId) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ message: "You cannot transfer to yourself" });
    }

    // Calculate fee
    const settings = await Settings.findOne().lean();
    const feePercent = settings?.balanceTransferFeePercent ?? 0;
    const feeAmount = parseFloat(
      ((transferAmount * feePercent) / 100).toFixed(2)
    );
    const totalDeduction = parseFloat((transferAmount + feeAmount).toFixed(2));

    // Read sender wallet to build deduction plan
    const senderWalletDoc = await Wallet.findOne({ userId: senderId }).lean();
    if (!senderWalletDoc) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Insufficient balance" });
    }

    const incUpdate = buildDeductionInc(
      senderWalletDoc as unknown as Record<string, number>,
      totalDeduction
    );
    const loanAmount = senderWalletDoc.loanAmount ?? 0;
    const effectiveBalance = (senderWalletDoc.totalBalance ?? 0) - loanAmount;
    if (!incUpdate || effectiveBalance < totalDeduction) {
      await session.abortTransaction();
      return res.status(400).json({
        message: `Insufficient balance. You need ৳${totalDeduction.toLocaleString()} but only have ৳${effectiveBalance.toLocaleString()}.`,
      });
    }

    // Apply deduction atomically — also guard totalBalance (+ loanAmount) to prevent race condition
    const updatedSenderWallet = await Wallet.findOneAndUpdate(
      {
        userId: senderId,
        totalBalance: { $gte: totalDeduction + loanAmount },
      },
      { $inc: incUpdate },
      { new: true, session }
    );

    if (!updatedSenderWallet) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Insufficient balance" });
    }

    // Credit receiver
    const receiverWallet = await Wallet.findOneAndUpdate(
      { userId: receiver._id.toString() },
      {
        $inc: { transferBalance: transferAmount, totalBalance: transferAmount },
        $setOnInsert: {
          userId: receiver._id.toString(),
          directCommissionBalance: 0,
          manCommFromDownPayment: 0,
          manCommFromInstallment: 0,
          salaryBalanceFromRanks: 0,
          cashbackBalance: 0,
        },
      },
      { upsert: true, new: true, session }
    );

    const now = new Date();

    await TransactionLog.create(
      [
        {
          userId: senderId,
          type: "transfer_sent",
          amount: totalDeduction,
          balanceAfter: updatedSenderWallet.totalBalance,
          note: `Transferred ৳${transferAmount} to @${receiver.username}${
            feeAmount > 0 ? ` (fee: ৳${feeAmount}, rate: ${feePercent}%)` : ""
          }`,
          createdAt: now,
        },
      ],
      { session }
    );

    await TransactionLog.create(
      [
        {
          userId: receiver._id.toString(),
          type: "transfer_received",
          amount: transferAmount,
          balanceAfter: receiverWallet.totalBalance,
          note: `Received ৳${transferAmount} from @${req.user!.username}`,
          createdAt: now,
        },
      ],
      { session }
    );

    if (feeAmount > 0) {
      await CompanyLedger.create(
        [
          {
            date: now,
            type: "transfer_fee_received",
            amount: feeAmount,
            userId: senderId,
            note: `Transfer fee from @${req.user!.username} → @${
              receiver.username
            } (${feePercent}% of ৳${transferAmount})`,
          },
        ],
        { session }
      );
    }

    await session.commitTransaction();

    res.json({
      message: `Successfully transferred ৳${transferAmount} to @${
        receiver.username
      }.${feeAmount > 0 ? ` Fee: ৳${feeAmount}.` : ""}`,
      transferred: transferAmount,
      fee: feeAmount,
      totalDeducted: totalDeduction,
    });
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};

export const getTransferFee = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const settings = await Settings.findOne().lean();
    res.json({ feePercent: settings?.balanceTransferFeePercent ?? 0 });
  } catch (err) {
    next(err);
  }
};
