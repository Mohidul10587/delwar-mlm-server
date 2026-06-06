import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const oid = () => new mongoose.Types.ObjectId();

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const col = mongoose.connection.collection("producttypes");
  const types = await col.find({}).toArray();

  for (const t of types) {
    const categories = (t.categories ?? []).map((c: any) => ({
      _id: c._id ?? oid(),
      ...c,
      subCategories: (c.subCategories ?? []).map((s: any) => ({
        _id: s._id ?? oid(),
        ...s,
        brands: (s.brands ?? []).map((b: any) => ({
          _id: b._id ?? oid(),
          ...b,
          models: (b.models ?? []).map((m: any) => ({ _id: m._id ?? oid(), ...m })),
        })),
      })),
    }));

    await col.updateOne({ _id: t._id }, { $set: { categories } });
  }

  console.log(`Migrated ${types.length} product types`);
  await mongoose.disconnect();
}

migrate().catch(console.error);
