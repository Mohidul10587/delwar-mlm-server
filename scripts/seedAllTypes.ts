import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const types = [
  { title: { en: "Food & Beverages", bn: "খাদ্য ও পানীয়" }, slug: "food-beverages" },
  { title: { en: "Electronics", bn: "ইলেকট্রনিক্স" }, slug: "electronics" },
  { title: { en: "Fashion", bn: "ফ্যাশন" }, slug: "fashion" },
  { title: { en: "Home & Living", bn: "হোম ও লিভিং" }, slug: "home-living" },
  { title: { en: "Health & Beauty", bn: "স্বাস্থ্য ও সৌন্দর্য" }, slug: "health-beauty" },
  { title: { en: "Sports & Outdoors", bn: "স্পোর্টস ও আউটডোর" }, slug: "sports-outdoors" },
  { title: { en: "Books & Stationery", bn: "বই ও স্টেশনারি" }, slug: "books-stationery" },
  { title: { en: "Toys & Kids", bn: "খেলনা ও শিশু" }, slug: "toys-kids" },
  { title: { en: "Automotive", bn: "অটোমোটিভ" }, slug: "automotive" },
  { title: { en: "Computer & Accessories", bn: "কম্পিউটার ও এক্সেসরিজ" }, slug: "computer-accessories" },
  { title: { en: "Mobile & Tablets", bn: "মোবাইল ও ট্যাবলেট" }, slug: "mobile-tablets" },
  { title: { en: "Furniture", bn: "ফার্নিচার" }, slug: "furniture" },
  { title: { en: "Jewelry & Watches", bn: "জুয়েলারি ও ঘড়ি" }, slug: "jewelry-watches" },
  { title: { en: "Pet Supplies", bn: "পোষা প্রাণীর সামগ্রী" }, slug: "pet-supplies" },
  { title: { en: "Musical Instruments", bn: "বাদ্যযন্ত্র" }, slug: "musical-instruments" },
  { title: { en: "Office Supplies", bn: "অফিস সামগ্রী" }, slug: "office-supplies" },
  { title: { en: "Garden & Outdoor", bn: "বাগান ও আউটডোর" }, slug: "garden-outdoor" },
  { title: { en: "Baby Products", bn: "শিশু পণ্য" }, slug: "baby-products" },
  { title: { en: "Tools & Hardware", bn: "টুলস ও হার্ডওয়্যার" }, slug: "tools-hardware" },
  { title: { en: "Gift & Occasions", bn: "উপহার ও উপলক্ষ" }, slug: "gift-occasions" },
  { title: { en: "Cleaning & Household", bn: "পরিষ্কার ও গৃহস্থালি" }, slug: "cleaning-household" },
  { title: { en: "Industrial & Scientific", bn: "শিল্প ও বৈজ্ঞানিক" }, slug: "industrial-scientific" },
  { title: { en: "Art & Craft", bn: "আর্ট ও ক্রাফট" }, slug: "art-craft" },
  { title: { en: "Travel & Luggage", bn: "ভ্রমণ ও লাগেজ" }, slug: "travel-luggage" },
  { title: { en: "Medicines & Healthcare", bn: "ওষুধ ও স্বাস্থ্যসেবা" }, slug: "medicines-healthcare" },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log("Connected to MongoDB");

  const schema = new mongoose.Schema({}, { strict: false });
  const ProductType = mongoose.models.ProductType || mongoose.model("ProductType", schema);

  for (const t of types) {
    await ProductType.updateOne(
      { slug: t.slug },
      { $setOnInsert: { ...t, id: t.slug, categories: [] } },
      { upsert: true }
    );
    console.log(`✅ ${t.title.en}`);
  }

  console.log("Done");
  await mongoose.disconnect();
}

seed().catch((e) => { console.error(e); process.exit(1); });
