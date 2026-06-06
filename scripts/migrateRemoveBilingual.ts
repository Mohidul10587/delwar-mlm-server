import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log("Connected");

  const db = mongoose.connection.db!;

  // Migrate settings: flatten bilingual fields to English string
  const bilingualSettingsFields = [
    "siteTitle", "siteTagline", "aboutMission", "aboutVision", "aboutValues",
    "metaDescription", "contactAddress",
  ];

  const settings = await db.collection("settings").find({}).toArray();
  for (const doc of settings) {
    const update: Record<string, string> = {};
    for (const field of bilingualSettingsFields) {
      if (doc[field] && typeof doc[field] === "object") {
        update[field] = doc[field].en || doc[field].bn || "";
      }
    }
    if (Object.keys(update).length) {
      await db.collection("settings").updateOne({ _id: doc._id }, { $set: update });
      console.log(`settings ${doc._id}: updated ${Object.keys(update).join(", ")}`);
    }
  }

  // Migrate shares: flatten title { en, bn } to string
  const shares = await db.collection("shares").find({}).toArray();
  for (const doc of shares) {
    if (doc.title && typeof doc.title === "object") {
      const title = doc.title.en || doc.title.bn || "";
      await db.collection("shares").updateOne({ _id: doc._id }, { $set: { title } });
      console.log(`share ${doc._id}: title → "${title}"`);
    }
  }

  console.log("Migration complete");
  await mongoose.disconnect();
}

migrate().catch((err) => { console.error(err); process.exit(1); });
