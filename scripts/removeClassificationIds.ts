import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI as string);

  const col = mongoose.connection.collection("producttypes");

  // Drop the old unique index on custom id field
  try { await col.dropIndex("id_1"); console.log("Dropped index id_1"); }
  catch { console.log("Index id_1 not found, skipping"); }

  const types = await col.find({}).toArray();

  for (const t of types) {
    const categories = (t.categories ?? []).map((c: any) => {
      const { id: _cid, ...cat } = c;
      cat.subCategories = (cat.subCategories ?? []).map((s: any) => {
        const { id: _sid, ...sub } = s;
        sub.brands = (sub.brands ?? []).map((b: any) => {
          const { id: _bid, ...brand } = b;
          brand.models = (brand.models ?? []).map((m: any) => {
            const { id: _mid, ...model } = m;
            return model;
          });
          return brand;
        });
        return sub;
      });
      return cat;
    });

    const { id: _tid, ...rest } = t;
    await col.replaceOne({ _id: t._id }, { ...rest, categories });
  }

  console.log(`Migrated ${types.length} product types`);
  await mongoose.disconnect();
}

migrate().catch(console.error);
