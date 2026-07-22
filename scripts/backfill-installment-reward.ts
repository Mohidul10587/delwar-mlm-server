import dotenv from "dotenv";
import mongoose from "mongoose";
import { InstallmentPayment } from "../src/app/purchase/installment.model";
import { processRewardAfterPayment } from "../src/app/reward-tracker/service";
import { RewardTracker } from "../src/app/reward-tracker/model";

dotenv.config({ path: ".env" });

const paymentId = process.argv[2];

async function main() {
  if (!paymentId || !mongoose.isValidObjectId(paymentId)) {
    throw new Error("Usage: ts-node scripts/backfill-installment-reward.ts <approved-payment-id>");
  }

  await mongoose.connect(process.env.MONGODB_URI as string);

  const payment = await InstallmentPayment.findById(paymentId).lean();
  if (!payment) throw new Error("Installment payment not found");
  if (payment.status !== "approved") {
    throw new Error("Only an approved installment payment can be backfilled");
  }

  await processRewardAfterPayment(
    payment.purchaseId.toString(),
    payment.amount,
    payment._id.toString()
  );

  const tracker = await RewardTracker.findOne({ purchaseId: payment.purchaseId })
    .select("completedCycles carryForwardAmount cycles processedPaymentIds")
    .lean();
  console.log(JSON.stringify({ paymentId, tracker }, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
