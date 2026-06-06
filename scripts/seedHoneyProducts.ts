import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const titles = [
  "Sundarban Honey", "Black Seed Honey", "Crystal Honey", "Lichu Flower Honey",
  "African Wild Honey", "Sidr Honey", "Clover Honey", "Manuka Honey",
  "Raw Forest Honey", "Organic Honey", "Multiflora Honey", "Acacia Honey",
  "Buckwheat Honey", "Lavender Honey", "Thyme Honey", "Eucalyptus Honey",
  "Orange Blossom Honey", "Wildflower Honey", "Creamed Honey", "Dark Honey",
  "Light Honey", "Comb Honey", "Infused Honey", "Ginger Honey",
  "Turmeric Honey", "Cinnamon Honey", "Lemon Honey", "Garlic Honey",
  "Chili Honey", "Rosemary Honey", "Sage Honey", "Tualang Honey",
  "Gelam Honey", "Stingless Bee Honey", "Jungle Honey", "Mountain Honey",
  "Spring Honey", "Summer Honey", "Winter Honey", "Autumn Honey",
  "Premium Honey", "Pure Honey", "Natural Honey", "Filtered Honey",
  "Unfiltered Honey", "Cold Pressed Honey", "Raw Honey", "Aged Honey",
  "Blended Honey", "Specialty Honey",
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const col = mongoose.connection.collection("products");

  const base = {
    img: ["https://res.cloudinary.com/dr9az74sd/image/upload/v1775285686/jlfjcgqa1mysouycivf7.png"],
    regularPrice: 5000,
    salePrice: 4000,
    isAffiliate: false,
    affCommPercent: 0,
    description: "",
    isEnabledByAdmin: true,
    metaTitle: "", metaDescription: "", metaImage: "",
    keywords: [],
    type:     { id: "69d00211e4b49997cf485748", title: { en: "Food & Beverages", bn: "খাদ্য ও পানীয়" }, slug: "food-beverages", image: "" },
    category: { id: "69d0b3e502a3ca5c9cfc0525", title: { en: "Honey", bn: "মধু" }, slug: "honey", image: "https://res.cloudinary.com/dr9az74sd/image/upload/v1775282430/zkdyctvkeembe0aepfz3.png" },
    subcategory: { id: "69d0b3e502a3ca5c9cfc0526", title: { en: "Mustard honey", bn: "সরিষার মধু" }, slug: "mustard-honey", image: "https://res.cloudinary.com/dr9az74sd/image/upload/v1775282846/ypbfrrz1mqndhaz0eupt.png" },
    foodBeveragesInfo: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    __v: 0,
  };

  const docs = titles.map((en) => ({
    ...base,
    title: { en, bn: "" },
    slug: en.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + Date.now() + Math.floor(Math.random() * 1000),
  }));

  await col.insertMany(docs);
  console.log(`Inserted ${docs.length} products`);
  await mongoose.disconnect();
}

seed().catch(console.error);
