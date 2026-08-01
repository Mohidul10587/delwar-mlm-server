import mongoose, { Types } from "mongoose";
import { z } from "zod";
import { Capital, ICapital } from "./model";
import { CompanyLedger } from "../ledger/model";

const capitalInputSchema = z.object({
  date: z.coerce.date({ error: "A valid date is required" }),
  description: z.string().trim().min(1, "Description is required"),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  paymentInfo: z.string().trim().optional().default(""),
  paidBy: z.string().trim().optional().default(""),
  voucherNo: z.string().trim().optional().default(""),
  document: z.string().trim().optional().default(""),
});

export type CapitalInput = z.infer<typeof capitalInputSchema>;

const ledgerNote = (capital: Pick<CapitalInput, "description" | "paidBy" | "voucherNo" | "paymentInfo">) =>
  [
    `Capital received: ${capital.description}`,
    capital.paidBy && `Paid by: ${capital.paidBy}`,
    capital.voucherNo && `Voucher: ${capital.voucherNo}`,
    capital.paymentInfo && `Payment info: ${capital.paymentInfo}`,
  ].filter(Boolean).join(" | ");

const notFound = (message: string) => Object.assign(new Error(message), { status: 404 });

export const parseCapitalInput = (input: unknown): CapitalInput => capitalInputSchema.parse(input);

export async function createCapital(input: CapitalInput, userId: Types.ObjectId): Promise<ICapital> {
  const session = await mongoose.startSession();
  try {
    let capital: ICapital | null = null;
    await session.withTransaction(async () => {
      // Create the source record first, then atomically attach its one ledger row.
      const [created] = await Capital.create([{
        ...input,
        ledgerId: new Types.ObjectId(),
        createdBy: userId,
        updatedBy: userId,
      }], { session });
      const ledger = new CompanyLedger({
        _id: created.ledgerId,
        date: input.date,
        type: "capital_received",
        amount: input.amount,
        relatedId: created._id,
        relatedModel: "Capital",
        note: ledgerNote(input),
      });
      await ledger.save({ session });
      capital = created;
    });
    return capital!;
  } finally {
    await session.endSession();
  }
}

export async function updateCapital(id: string, input: CapitalInput, userId: Types.ObjectId): Promise<ICapital> {
  const session = await mongoose.startSession();
  try {
    let capital: ICapital | null = null;
    await session.withTransaction(async () => {
      const existing = await Capital.findById(id).session(session);
      if (!existing) throw notFound("Capital entry not found");

      const ledger = await CompanyLedger.findOneAndUpdate(
        { _id: existing.ledgerId, relatedId: existing._id, type: "capital_received" },
        { $set: { date: input.date, amount: input.amount, note: ledgerNote(input) } },
        { new: true, session }
      );
      if (!ledger) throw new Error("Related capital ledger entry is missing");

      Object.assign(existing, input, { updatedBy: userId });
      await existing.save({ session });
      capital = existing;
    });
    return capital!;
  } finally {
    await session.endSession();
  }
}

export async function deleteCapital(id: string): Promise<void> {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const capital = await Capital.findById(id).session(session);
      if (!capital) throw notFound("Capital entry not found");
      const deletedLedger = await CompanyLedger.findOneAndDelete({
        _id: capital.ledgerId, relatedId: capital._id, type: "capital_received",
      }, { session });
      if (!deletedLedger) throw new Error("Related capital ledger entry is missing");
      await capital.deleteOne({ session });
    });
  } finally {
    await session.endSession();
  }
}
