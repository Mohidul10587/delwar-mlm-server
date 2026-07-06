/**
 * Migration: merge single `image` field into `images[]` array, then remove `image`.
 * Run from the `s/` directory:
 *   node scripts/migrateImageToImages.js
 */

const { MongoClient } = require("mongodb");
require("dotenv").config();

async function migrate() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  const col = db.collection("projects");

  const docs = await col.find({ image: { $exists: true, $ne: "" } }).toArray();
  console.log(`Found ${docs.length} documents with 'image' field.`);

  let migrated = 0;
  for (const doc of docs) {
    const images = doc.images ?? [];
    if (!images.includes(doc.image)) {
      // Prepend old image to the front of images[]
      await col.updateOne(
        { _id: doc._id },
        { $set: { images: [doc.image, ...images] }, $unset: { image: "" } }
      );
    } else {
      // Already in images[], just remove the field
      await col.updateOne({ _id: doc._id }, { $unset: { image: "" } });
    }
    migrated++;
  }

  // Clean up any docs with empty image field
  await col.updateMany({ image: "" }, { $unset: { image: "" } });

  console.log(
    `Done. Migrated ${migrated} documents: 'image' merged into 'images[0]' and removed.`
  );
  await client.close();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
