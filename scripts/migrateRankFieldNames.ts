/**
 * Migration: Rename rank-related field names in MongoDB
 *
 * Settings.ranks[] subdocuments:
 *   requiredApprovedSales  → minNetworkSalesAmount
 *   salary.durationMonths  → salary.salaryDurationMonths
 *   salary.minMonthlySales → salary.minMonthlySalesQty
 *   salary.requiredPersonalShares → salary.minPersonalPurchaseQty → salary.minMonthlyPersonalPurchaseQtyForSalary
 *
 * purchases[].snapshot.rankQualification[]:
 *   requiredApprovedSales  → minNetworkSalesAmount
 *
 * purchases[].snapshot.salaryRules[]:
 *   durationMonths         → salaryDurationMonths
 *   minMonthlySales        → minMonthlySalesQty
 *   requiredPersonalShares → minMonthlyPersonalPurchaseQtyForSalary
 */

import mongoose from "mongoose";

const MONGO_URI =
  "mongodb+srv://mohid10587:Usz0E31KP3fyyBQ3@cluster5.4relj71.mongodb.net/delwar-mlm?retryWrites=true&w=majority";

(async () => {
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  console.log("Connected to MongoDB");

  const db = mongoose.connection.db!;

  // ── 1. Settings.ranks[] ───────────────────────────────────────────────────

  // Fetch all settings docs that still have old field names
  const settingsDocs = await db
    .collection("settings")
    .find({ "ranks.requiredApprovedSales": { $exists: true } })
    .toArray();

  console.log(`Settings docs to migrate: ${settingsDocs.length}`);

  for (const doc of settingsDocs) {
    const newRanks = (doc.ranks ?? []).map((rank: any) => {
      const newRank: any = { ...rank };

      // requiredApprovedSales → minNetworkSalesAmount
      if ("requiredApprovedSales" in newRank) {
        newRank.minNetworkSalesAmount = newRank.requiredApprovedSales;
        delete newRank.requiredApprovedSales;
      }

      // salary sub-fields
      if (newRank.salary) {
        const s = { ...newRank.salary };

        if ("durationMonths" in s) {
          s.salaryDurationMonths = s.durationMonths;
          delete s.durationMonths;
        }
        if ("minMonthlySales" in s) {
          s.minMonthlySalesQty = s.minMonthlySales;
          delete s.minMonthlySales;
        }
        if ("requiredPersonalShares" in s) {
          s.minMonthlyPersonalPurchaseQtyForSalary = s.requiredPersonalShares;
          delete s.requiredPersonalShares;
        }

        newRank.salary = s;
      }

      return newRank;
    });

    await db
      .collection("settings")
      .updateOne({ _id: doc._id }, { $set: { ranks: newRanks } });

    console.log(`  ✓ Settings doc ${doc._id} migrated (${newRanks.length} ranks)`);
  }

  // ── 2. purchases[].snapshot.rankQualification[] ───────────────────────────

  const purchasesWithOldRankQual = await db
    .collection("purchases")
    .find({ "snapshot.rankQualification.requiredApprovedSales": { $exists: true } })
    .toArray();

  console.log(`\nPurchase docs with old rankQualification fields: ${purchasesWithOldRankQual.length}`);

  for (const doc of purchasesWithOldRankQual) {
    const newRQ = (doc.snapshot?.rankQualification ?? []).map((rq: any) => {
      if ("requiredApprovedSales" in rq) {
        const { requiredApprovedSales, ...rest } = rq;
        return { ...rest, minNetworkSalesAmount: requiredApprovedSales };
      }
      return rq;
    });

    await db
      .collection("purchases")
      .updateOne(
        { _id: doc._id },
        { $set: { "snapshot.rankQualification": newRQ } }
      );
  }

  console.log(`  ✓ ${purchasesWithOldRankQual.length} purchase rankQualification arrays migrated`);

  // ── 3. purchases[].snapshot.salaryRules[] ────────────────────────────────

  const purchasesWithOldSalaryRules = await db
    .collection("purchases")
    .find({
      $or: [
        { "snapshot.salaryRules.durationMonths": { $exists: true } },
        { "snapshot.salaryRules.minMonthlySales": { $exists: true } },
        { "snapshot.salaryRules.requiredPersonalShares": { $exists: true } },
      ],
    })
    .toArray();

  console.log(`\nPurchase docs with old salaryRules fields: ${purchasesWithOldSalaryRules.length}`);

  for (const doc of purchasesWithOldSalaryRules) {
    const newSR = (doc.snapshot?.salaryRules ?? []).map((sr: any) => {
      const n: any = { ...sr };

      if ("durationMonths" in n) {
        n.salaryDurationMonths = n.durationMonths;
        delete n.durationMonths;
      }
      if ("minMonthlySales" in n) {
        n.minMonthlySalesQty = n.minMonthlySales;
        delete n.minMonthlySales;
      }
      if ("requiredPersonalShares" in n) {
        n.minMonthlyPersonalPurchaseQtyForSalary = n.requiredPersonalShares;
        delete n.requiredPersonalShares;
      }

      return n;
    });

    await db
      .collection("purchases")
      .updateOne(
        { _id: doc._id },
        { $set: { "snapshot.salaryRules": newSR } }
      );
  }

  console.log(`  ✓ ${purchasesWithOldSalaryRules.length} purchase salaryRules arrays migrated`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n✅ Migration complete.");
  await mongoose.disconnect();
})().catch((e) => {
  console.error("Migration failed:", e.message);
  process.exit(1);
});
