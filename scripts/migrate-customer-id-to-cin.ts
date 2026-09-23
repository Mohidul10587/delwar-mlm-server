/**
 * Migration Script: CUS → CIN
 *
 * এই স্ক্রিপ্টটি দুটি কাজ করে:
 * 1. যত ইউজারের customerId "CUS-" দিয়ে শুরু, সেগুলো "CIN-" তে রিপ্লেস করে।
 * 2. যত ইউজারের customerId একদমই নেই, তাদের জন্য নতুন "CIN-" আইডি জেনারেট করে।
 *
 * Usage:
 *   cd s
 *   npx ts-node scripts/migrate-customer-id-to-cin.ts
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import { User } from "../src/app/user/model";
import { Counter } from "../src/app/user/counter";

dotenv.config({ path: ".env" });

async function syncCounterAndGenerateCinId(): Promise<string> {
  const year = new Date().getFullYear();
  const counterId = `cin-seq-${year}`;
  const prefix = `CIN-${year}`;

  // বিদ্যমান সর্বোচ্চ CIN নম্বর বের করি
  const maxUser = await User.findOne({ customerId: new RegExp(`^CIN-${year}`) })
    .sort({ customerId: -1 })
    .select("customerId")
    .lean();

  let maxSeq = 0;
  if (maxUser && (maxUser as any).customerId) {
    const parts = ((maxUser as any).customerId as string).replace(prefix, "");
    const parsed = parseInt(parts, 10);
    if (!isNaN(parsed)) maxSeq = parsed;
  }

  // Counter কে সর্বোচ্চ নম্বরে সিঙ্ক করি, তারপর +1 করি
  const doc = await Counter.findOneAndUpdate(
    { _id: counterId, seq: { $lte: maxSeq } },
    { $set: { seq: maxSeq } },
    { new: true, upsert: true }
  );

  // এবার atomic increment
  const updated = await Counter.findOneAndUpdate(
    { _id: counterId },
    { $inc: { seq: 1 } },
    { new: true }
  );

  const seq = updated?.seq ?? maxSeq + 1;
  const padded = String(seq).padStart(5, "0");
  return `${prefix}${padded}`;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set in .env");

  console.log("MongoDB তে সংযুক্ত হচ্ছে...");
  await mongoose.connect(uri);
  console.log("সংযুক্ত হয়েছে।\n");

  // ── ১. CUS- → CIN- রিপ্লেস ─────────────────────────────────────────────
  const cusUsers = await User.find({ customerId: /^CUS-/ }).select(
    "_id customerId"
  );

  console.log(`CUS- আইডি আছে এমন ইউজার: ${cusUsers.length} জন`);

  let cusMigrated = 0;
  for (const user of cusUsers) {
    const oldId = user.customerId;
    const newId = oldId.replace(/^CUS-/, "CIN-");
    await User.updateOne({ _id: user._id }, { $set: { customerId: newId } });
    console.log(`  ✓ ${oldId}  →  ${newId}`);
    cusMigrated++;
  }

  // ── ২. customerId নেই → নতুন CIN- জেনারেট করো ──────────────────────────
  const noIdUsers = await User.find({
    $or: [{ customerId: null }, { customerId: { $exists: false } }],
  }).select("_id username name");

  console.log(`\ncustomerId নেই এমন ইউজার: ${noIdUsers.length} জন`);

  let generatedCount = 0;
  for (const user of noIdUsers) {
    const newId = await syncCounterAndGenerateCinId();
    await User.updateOne({ _id: user._id }, { $set: { customerId: newId } });
    console.log(
      `  ✓ ${user.username ?? user._id}  →  ${newId} (নতুন আইডি তৈরি)`
    );
    generatedCount++;
  }

  console.log("\n══════════════════════════════════════════");
  console.log(`মাইগ্রেশন সম্পন্ন:`);
  console.log(`  CUS → CIN রিপ্লেস হয়েছে : ${cusMigrated} টি`);
  console.log(`  নতুন CIN আইডি তৈরি হয়েছে : ${generatedCount} টি`);
  console.log("══════════════════════════════════════════\n");
}

main()
  .catch((err) => {
    console.error("মাইগ্রেশন ব্যর্থ হয়েছে:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
    console.log("MongoDB সংযোগ বিচ্ছিন্ন হয়েছে।");
  });
