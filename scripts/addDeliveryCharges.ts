import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const insideOptions = [40, 50, 60, 70, 80];
const outsideOptions = [100, 110, 120, 130, 150];

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const products = await mongoose.connection.collection("products").find({}).toArray();
  for (const p of products) {
    await mongoose.connection.collection("products").updateOne(
      { _id: p._id },
      { $set: {
        deliveryChargeInsideDhaka: insideOptions[Math.floor(Math.random() * insideOptions.length)],
        deliveryChargeOutsideDhaka: outsideOptions[Math.floor(Math.random() * outsideOptions.length)],
      }}
    );
  }
  console.log(`Updated ${products.length} products with random delivery charges`);
  await mongoose.disconnect();
}

run().catch(console.error);
