import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const uid = () => Math.random().toString(36).slice(2, 9);

const foodType = {
  id: "pt-14",
  title: { en: "Food & Beverages", bn: "খাদ্য ও পানীয়" },
  slug: "food-beverages",
  image: "",
  categories: [
    {
      id: uid(),
      title: { en: "Rice & Grains", bn: "চাল ও শস্য" },
      slug: "rice-grains",
      subCategories: [
        {
          id: uid(),
          title: { en: "Rice", bn: "চাল" },
          slug: "rice",
          brands: [
            {
              id: uid(),
              title: { en: "Miniket", bn: "মিনিকেট" },
              slug: "miniket",
            },
            {
              id: uid(),
              title: { en: "Nazirshail", bn: "নাজিরশাইল" },
              slug: "nazirshail",
            },
            {
              id: uid(),
              title: { en: "Chinigura", bn: "চিনিগুড়া" },
              slug: "chinigura",
            },
          ],
        },
        {
          id: uid(),
          title: { en: "Wheat & Flour", bn: "গম ও আটা" },
          slug: "wheat-flour",
          brands: [
            { id: uid(), title: { en: "Fresh", bn: "ফ্রেশ" }, slug: "fresh" },
            { id: uid(), title: { en: "ACI", bn: "এসিআই" }, slug: "aci" },
          ],
        },
        {
          id: uid(),
          title: { en: "Lentils & Pulses", bn: "ডাল" },
          slug: "lentils-pulses",
          brands: [
            { id: uid(), title: { en: "Pran", bn: "প্রাণ" }, slug: "pran" },
            {
              id: uid(),
              title: { en: "BD Food", bn: "বিডি ফুড" },
              slug: "bd-food",
            },
          ],
        },
      ],
    },
    {
      id: uid(),
      title: { en: "Oil & Ghee", bn: "তেল ও ঘি" },
      slug: "oil-ghee",
      subCategories: [
        {
          id: uid(),
          title: { en: "Cooking Oil", bn: "রান্নার তেল" },
          slug: "cooking-oil",
          brands: [
            { id: uid(), title: { en: "Teer", bn: "তীর" }, slug: "teer" },
            {
              id: uid(),
              title: { en: "Rupchanda", bn: "রূপচাঁদা" },
              slug: "rupchanda",
            },
            { id: uid(), title: { en: "Pran", bn: "প্রাণ" }, slug: "pran-oil" },
          ],
        },
        {
          id: uid(),
          title: { en: "Ghee", bn: "ঘি" },
          slug: "ghee",
          brands: [
            { id: uid(), title: { en: "Aarong", bn: "আড়ং" }, slug: "aarong" },
            {
              id: uid(),
              title: { en: "Milk Vita", bn: "মিল্ক ভিটা" },
              slug: "milk-vita",
            },
          ],
        },
        {
          id: uid(),
          title: { en: "Mustard Oil", bn: "সরিষার তেল" },
          slug: "mustard-oil",
          brands: [
            {
              id: uid(),
              title: { en: "Pran", bn: "প্রাণ" },
              slug: "pran-mustard",
            },
            {
              id: uid(),
              title: { en: "Radhuni", bn: "রাঁধুনী" },
              slug: "radhuni",
            },
          ],
        },
      ],
    },
    {
      id: uid(),
      title: { en: "Spices & Condiments", bn: "মশলা ও কন্ডিমেন্ট" },
      slug: "spices-condiments",
      subCategories: [
        {
          id: uid(),
          title: { en: "Ground Spices", bn: "গুঁড়া মশলা" },
          slug: "ground-spices",
          brands: [
            {
              id: uid(),
              title: { en: "Radhuni", bn: "রাঁধুনী" },
              slug: "radhuni-spice",
            },
            {
              id: uid(),
              title: { en: "Pran", bn: "প্রাণ" },
              slug: "pran-spice",
            },
            {
              id: uid(),
              title: { en: "BD Food", bn: "বিডি ফুড" },
              slug: "bd-food-spice",
            },
          ],
        },
        {
          id: uid(),
          title: { en: "Salt & Sugar", bn: "লবণ ও চিনি" },
          slug: "salt-sugar",
          brands: [
            {
              id: uid(),
              title: { en: "Molla Salt", bn: "মোল্লা সল্ট" },
              slug: "molla-salt",
            },
            {
              id: uid(),
              title: { en: "Fresh", bn: "ফ্রেশ" },
              slug: "fresh-sugar",
            },
          ],
        },
        {
          id: uid(),
          title: { en: "Sauce & Ketchup", bn: "সস ও কেচাপ" },
          slug: "sauce-ketchup",
          brands: [
            {
              id: uid(),
              title: { en: "Pran", bn: "প্রাণ" },
              slug: "pran-sauce",
            },
            { id: uid(), title: { en: "Ruchi", bn: "রুচি" }, slug: "ruchi" },
          ],
        },
      ],
    },
    {
      id: uid(),
      title: { en: "Dairy & Eggs", bn: "দুগ্ধজাত ও ডিম" },
      slug: "dairy-eggs",
      subCategories: [
        {
          id: uid(),
          title: { en: "Milk", bn: "দুধ" },
          slug: "milk",
          brands: [
            {
              id: uid(),
              title: { en: "Milk Vita", bn: "মিল্ক ভিটা" },
              slug: "milk-vita-milk",
            },
            {
              id: uid(),
              title: { en: "Aarong", bn: "আড়ং" },
              slug: "aarong-milk",
            },
            {
              id: uid(),
              title: { en: "Pran", bn: "প্রাণ" },
              slug: "pran-milk",
            },
          ],
        },
        {
          id: uid(),
          title: { en: "Yogurt", bn: "দই" },
          slug: "yogurt",
          brands: [
            {
              id: uid(),
              title: { en: "Aarong", bn: "আড়ং" },
              slug: "aarong-yogurt",
            },
            {
              id: uid(),
              title: { en: "Milk Vita", bn: "মিল্ক ভিটা" },
              slug: "milk-vita-yogurt",
            },
          ],
        },
        {
          id: uid(),
          title: { en: "Eggs", bn: "ডিম" },
          slug: "eggs",
          brands: [
            {
              id: uid(),
              title: { en: "Kazi Farms", bn: "কাজী ফার্মস" },
              slug: "kazi-farms",
            },
            { id: uid(), title: { en: "CP", bn: "সিপি" }, slug: "cp" },
          ],
        },
        {
          id: uid(),
          title: { en: "Cheese & Butter", bn: "পনির ও মাখন" },
          slug: "cheese-butter",
          brands: [
            {
              id: uid(),
              title: { en: "Aarong", bn: "আড়ং" },
              slug: "aarong-cheese",
            },
            {
              id: uid(),
              title: { en: "Pran", bn: "প্রাণ" },
              slug: "pran-butter",
            },
          ],
        },
      ],
    },
    {
      id: uid(),
      title: { en: "Snacks & Biscuits", bn: "স্ন্যাকস ও বিস্কুট" },
      slug: "snacks-biscuits",
      subCategories: [
        {
          id: uid(),
          title: { en: "Chips & Crisps", bn: "চিপস" },
          slug: "chips-crisps",
          brands: [
            {
              id: uid(),
              title: { en: "Pran", bn: "প্রাণ" },
              slug: "pran-chips",
            },
            {
              id: uid(),
              title: { en: "Bombay Sweets", bn: "বম্বে সুইটস" },
              slug: "bombay-sweets",
            },
          ],
        },
        {
          id: uid(),
          title: { en: "Biscuits & Cookies", bn: "বিস্কুট ও কুকিজ" },
          slug: "biscuits-cookies",
          brands: [
            {
              id: uid(),
              title: { en: "Olympic", bn: "অলিম্পিক" },
              slug: "olympic",
            },
            {
              id: uid(),
              title: { en: "Nabisco", bn: "নাবিস্কো" },
              slug: "nabisco",
            },
            {
              id: uid(),
              title: { en: "Pran", bn: "প্রাণ" },
              slug: "pran-biscuit",
            },
          ],
        },
        {
          id: uid(),
          title: { en: "Chanachur & Murmura", bn: "চানাচুর ও মুড়ি" },
          slug: "chanachur-murmura",
          brands: [
            {
              id: uid(),
              title: { en: "Pran", bn: "প্রাণ" },
              slug: "pran-chanachur",
            },
            {
              id: uid(),
              title: { en: "Ruchi", bn: "রুচি" },
              slug: "ruchi-chanachur",
            },
          ],
        },
      ],
    },
    {
      id: uid(),
      title: { en: "Beverages", bn: "পানীয়" },
      slug: "beverages",
      subCategories: [
        {
          id: uid(),
          title: { en: "Soft Drinks", bn: "সফট ড্রিংকস" },
          slug: "soft-drinks",
          brands: [
            {
              id: uid(),
              title: { en: "Coca-Cola", bn: "কোকা-কোলা" },
              slug: "coca-cola",
            },
            { id: uid(), title: { en: "Pepsi", bn: "পেপসি" }, slug: "pepsi" },
            {
              id: uid(),
              title: { en: "Pran", bn: "প্রাণ" },
              slug: "pran-drinks",
            },
          ],
        },
        {
          id: uid(),
          title: { en: "Juice", bn: "জুস" },
          slug: "juice",
          brands: [
            {
              id: uid(),
              title: { en: "Pran", bn: "প্রাণ" },
              slug: "pran-juice",
            },
            { id: uid(), title: { en: "Shezan", bn: "শেজান" }, slug: "shezan" },
            { id: uid(), title: { en: "Acme", bn: "একমি" }, slug: "acme" },
          ],
        },
        {
          id: uid(),
          title: { en: "Tea & Coffee", bn: "চা ও কফি" },
          slug: "tea-coffee",
          brands: [
            {
              id: uid(),
              title: { en: "Ispahani", bn: "ইস্পাহানি" },
              slug: "ispahani",
            },
            { id: uid(), title: { en: "Taaza", bn: "তাজা" }, slug: "taaza" },
            {
              id: uid(),
              title: { en: "Nescafe", bn: "নেসক্যাফে" },
              slug: "nescafe",
            },
          ],
        },
        {
          id: uid(),
          title: { en: "Water", bn: "পানি" },
          slug: "water",
          brands: [
            { id: uid(), title: { en: "Mum", bn: "মাম" }, slug: "mum" },
            {
              id: uid(),
              title: { en: "Pran", bn: "প্রাণ" },
              slug: "pran-water",
            },
            {
              id: uid(),
              title: { en: "Fresh", bn: "ফ্রেশ" },
              slug: "fresh-water",
            },
          ],
        },
      ],
    },
    {
      id: uid(),
      title: { en: "Frozen & Processed", bn: "ফ্রোজেন ও প্রক্রিয়াজাত" },
      slug: "frozen-processed",
      subCategories: [
        {
          id: uid(),
          title: { en: "Frozen Chicken", bn: "ফ্রোজেন মুরগি" },
          slug: "frozen-chicken",
          brands: [
            {
              id: uid(),
              title: { en: "Kazi Farms", bn: "কাজী ফার্মস" },
              slug: "kazi-farms-chicken",
            },
            { id: uid(), title: { en: "CP", bn: "সিপি" }, slug: "cp-chicken" },
          ],
        },
        {
          id: uid(),
          title: { en: "Noodles & Pasta", bn: "নুডলস ও পাস্তা" },
          slug: "noodles-pasta",
          brands: [
            {
              id: uid(),
              title: { en: "Pran", bn: "প্রাণ" },
              slug: "pran-noodles",
            },
            { id: uid(), title: { en: "Maggi", bn: "ম্যাগি" }, slug: "maggi" },
          ],
        },
        {
          id: uid(),
          title: { en: "Canned & Shared", bn: "ক্যানড ও প্যাকেজড" },
          slug: "canned-packaged",
          brands: [
            {
              id: uid(),
              title: { en: "Pran", bn: "প্রাণ" },
              slug: "pran-canned",
            },
            {
              id: uid(),
              title: { en: "BD Food", bn: "বিডি ফুড" },
              slug: "bd-food-canned",
            },
          ],
        },
      ],
    },
    {
      id: uid(),
      title: { en: "Sweets & Desserts", bn: "মিষ্টি ও ডেজার্ট" },
      slug: "sweets-desserts",
      subCategories: [
        {
          id: uid(),
          title: { en: "Traditional Sweets", bn: "দেশীয় মিষ্টি" },
          slug: "traditional-sweets",
          brands: [
            {
              id: uid(),
              title: { en: "Banoful", bn: "বনফুল" },
              slug: "banoful",
            },
            {
              id: uid(),
              title: { en: "Mishti Doi", bn: "মিষ্টি দই" },
              slug: "mishti-doi",
            },
          ],
        },
        {
          id: uid(),
          title: { en: "Chocolate & Candy", bn: "চকলেট ও ক্যান্ডি" },
          slug: "chocolate-candy",
          brands: [
            {
              id: uid(),
              title: { en: "Cadbury", bn: "ক্যাডবেরি" },
              slug: "cadbury",
            },
            {
              id: uid(),
              title: { en: "Pran", bn: "প্রাণ" },
              slug: "pran-candy",
            },
          ],
        },
        {
          id: uid(),
          title: { en: "Ice Cream", bn: "আইসক্রিম" },
          slug: "ice-cream",
          brands: [
            { id: uid(), title: { en: "Igloo", bn: "ইগলু" }, slug: "igloo" },
            { id: uid(), title: { en: "Polar", bn: "পোলার" }, slug: "polar" },
          ],
        },
      ],
    },
  ],
};

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log("Connected to MongoDB");

  const ProductTypeSchema = new mongoose.Schema({}, { strict: false });
  const ProductType =
    mongoose.models.ProductType ||
    mongoose.model("ProductType", ProductTypeSchema);

  await ProductType.deleteOne({ slug: "food-beverages" });
  await ProductType.create(foodType);
  console.log("✅ Food & Beverages classification seeded successfully");
  await mongoose.disconnect();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
