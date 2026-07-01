import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Wallet, TransactionLog } from "../wallet/model";
import { CompanyLedger } from "../ledger/model";
import { Settings } from "../settings/model";
import { User } from "../user/model";

type TransferableBalance =
  | "directCommissionBalance"
  | "manCommFromDownPayment"
  | "manCommFromInstallment"
  | "salaryBalance"
  | "rewardBalance"
  | "transferBalance";

const TRANSFERABLE_FIELDS: TransferableBalance[] = [
  "directCommissionBalance",
  "manCommFromDownPayment",
  "manCommFromInstallment",
  "salaryBalance",
  "rewardBalance",
  "transferBalance",
];

export const sendTransfer = async (req: Request, res: Response, next: NextFunction) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const senderId = req.user!._id.toString();
    const { receiverUsername, amount, sourceBalance } = req.body;

    if (!receiverUsername || !amount || !sourceBalance) {
      await session.abortTransaction();
      return res.status(400).json({ message: "receiverUsername, amount and sourceBalance are required" });
    }

    const transferAmount = Number(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Amount must be greater than 0" });
    }

    if (!TRANSFERABLE_FIELDS.includes(sourceBalance as TransferableBalance)) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Invalid source balance type" });
    }

    const receiver = await User.findOne({ username: receiverUsername }).lean();
    if (!receiver) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Receiver not found" });
    }
    if (receiver._id.toString() === senderId) {
      await session.abortTransaction();
      return res.status(400).json({ message: "You cannot transfer to yourself" });
    }

    const settings = await Settings.findOne().lean();
    const feePercent = settings?.balanceTransferFeePercent ?? 0;
    const feeAmount = parseFloat(((transferAmount * feePercent) / 100).toFixed(2));
    const totalDeduction = parseFloat((transferAmount + feeAmount).toFixed(2));

    // C-01 Fix: atomic $inc with balance guard — no read-modify-write
    const senderWallet = await Wallet.findOneAndUpdate(
      {
        userId: senderId,
        [sourceBalance]: { $gte: totalDeduction }, // atomic guard
      },
      {
        $inc: {
          [sourceBalance]: -totalDeduction,
          totalBalance: -totalDeduction,
        },
      },
      { new: true, session }
    );

    if (!senderWallet) {
      await session.abortTransaction();
      return res.status(400).json({
        message: `Insufficient balance in selected source for ৳${totalDeduction.toLocaleString()} (৳${transferAmount} + ৳${feeAmount} fee).`,
      });
    }

    // Credit receiver atomically
    // L-10 Fix: use upsert so wallet is created if missing
    const receiverWallet = await Wallet.findOneAndUpdate(
      { userId: receiver._id.toString() },
      {
        $inc: { transferBalance: transferAmount, totalBalance: transferAmount },
        $setOnInsert: {
          userId: receiver._id.toString(),
          directCommissionBalance: 0,
          manCommFromDownPayment: 0,
          manCommFromInstallment: 0,
          salaryBalance: 0,
          rewardBalance: 0,
          incentiveBonus: 0,
        },
      },
      { upsert: true, new: true, session }
    );

    const now = new Date();

    await TransactionLog.create(
      [{
        userId: senderId,
        type: "transfer_sent",
        amount: totalDeduction,
        balanceAfter: senderWallet.totalBalance,
        note: `Transferred ৳${transferAmount} to @${receiver.username} (fee: ৳${feeAmount}, rate: ${feePercent}%)`,
        createdAt: now,
      }],
      { session }
    );

    await TransactionLog.create(
      [{
        userId: receiver._id.toString(),
        type: "transfer_received",
        amount: transferAmount,
        balanceAfter: receiverWallet.totalBalance,
        note: `Received ৳${transferAmount} from @${req.user!.username}`,
        createdAt: now,
      }],
      { session }
    );

    if (feeAmount > 0) {
      await CompanyLedger.create(
        [{
          date: now,
          type: "transfer_fee_received",
          amount: feeAmount,
          userId: senderId,
          note: `Transfer fee from @${req.user!.username} → @${receiver.username} (${feePercent}% of ৳${transferAmount})`,
        }],
        { session }
      );
    }

    await session.commitTransaction();

    res.json({
      message: `Successfully transferred ৳${transferAmount} to @${receiver.username}. Fee: ৳${feeAmount}.`,
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

export const getTransferFee = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await Settings.findOne().lean();
    res.json({ feePercent: settings?.balanceTransferFeePercent ?? 0 });
  } catch (err) { next(err); }
};
