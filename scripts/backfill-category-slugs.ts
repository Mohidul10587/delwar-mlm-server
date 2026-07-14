/**
 * Migration: backfill-category-slugs.ts
 *
 * Generates and saves a unique slug for every Category document that
 * currently has no slug (or an empty slug).
 *
 * Run once:
 *   cd s
 *   npx ts-node scripts/backfill-category-slugs.ts
 */

import mongoose from "mongoose";
import slugify from "slugify";
import dotenv from "dotenv";
dotenv.config();

// ── Minimal inline schema (avoids importing the full app model) ───────────────
const CategorySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    image: { type: String, default: null },
    order: { type: Number, default: 0 },
    slug: { type: String },
  },
  { timestamps: true }
);

const Category =
  mongoose.models.Category ||
  mongoose.model("Category", CategorySchema);

// ── Slug uniqueness helper ────────────────────────────────────────────────────

async function generateUniqueSlug(
  title: string,
  excludeId: mongoose.Types.ObjectId
): Promise<string> {
  const base = slugify(title, { lower: true, strict: true });
  let candidate = base;
  let counter = 1;

  while (true) {
    const exists = await Category.exists({
      slug: candidate,
      _id: { $ne: excludeId },
    });
    if (!exists) return candidate;
    candidate = `${base}-${counter}`;
    counter++;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌  MONGODB_URI is not set in .env");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("✅  Connected to MongoDB\n");

  // Find every category that is missing a slug
  const categories = await Category.find({
    $or: [{ slug: { $exists: false } }, { slug: "" }, { slug: null }],
  }).lean();

  if (categories.length === 0) {
    console.log("✔   All categories already have slugs. Nothing to do.");
    await mongoose.disconnect();
    return;
  }

  console.log(`📦  Found ${categories.length} categor${categories.length === 1 ? "y" : "ies"} without a slug.\n`);

  let updated = 0;
  let skipped = 0;

  for (const cat of categories) {
    const id = cat._id as mongoose.Types.ObjectId;

    if (!cat.title || cat.title.trim() === "") {
      console.warn(`⚠️   Skipping ${id} — title is empty`);
      skipped++;
      continue;
    }

    const slug = await generateUniqueSlug(cat.title.trim(), id);

    await Category.updateOne({ _id: id }, { $set: { slug } });

    console.log(`  ✅  "${cat.title}"  →  ${slug}`);
    updated++;
  }

  console.log(
    `\n🎉  Done — ${updated} updated, ${skipped} skipped.`
  );

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("❌  Migration failed:", err);
  process.exit(1);
});
