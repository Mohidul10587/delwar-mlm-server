import mongoose from "mongoose";
import { recalcUserRank } from "./src/app/rank/controller";
import { User } from "./src/app/user/model";
import { Purchase } from "./src/app/purchase/model";
import { Settings } from "./src/app/settings/model";

const MONGO_URI = "mongodb+srv://mohid10587:Usz0E31KP3fyyBQ3@cluster5.4relj71.mongodb.net/delwar-mlm?retryWrites=true&w=majority";

(async () => {
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 15000 });

  const mohid = await User.findOne({ username: "mohid" }).lean();
  const mohid2 = await User.findOne({ username: "mohid2" }).lean();
  console.log("mohid _id:", mohid!._id);
  console.log("mohid2 ancestors:", JSON.stringify(mohid2!.generationAncestors));

  // Gen 1 users of mohid
  const gen1 = await User.find({ generationAncestors: { $elemMatch: { userId: mohid!._id, level: 1 } } }).lean();
  console.log("Gen 1 users:", gen1.map(u => u.username));

  // Approved purchases
  if (gen1.length) {
    const count = await Purchase.countDocuments({ userId: { $in: gen1.map(u => u._id) }, status: "approved" });
    console.log("Gen 1 approved purchase count:", count);
  }

  // Settings ranks
  const s = await Settings.findOne();
  console.log("Ranks:", JSON.stringify(s!.ranks.map((r: any) => ({ name: r.name, minNetworkSalesAmount: r.minNetworkSalesAmount }))));

  // Run recalc
  await recalcUserRank(mohid!._id.toString());
  const updated = await User.findOne({ username: "mohid" }).lean();
  console.log("After recalc — currentRank:", updated!.currentRank, "earnedRanks:", updated!.earnedRanks);

  await mongoose.disconnect();
})().catch(e => { console.error(e.message); process.exit(1); });
