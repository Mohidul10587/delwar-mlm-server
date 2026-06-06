"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const model_1 = __importDefault(require("../category/model"));
const model_2 = __importDefault(require("../subcategory/model"));
const model_3 = __importDefault(require("./model"));
const router = express_1.default.Router();
const generateRandomTitle = () => {
    const prefixes = [
        { en: "New", bn: "নতুন" },
        { en: "Old", bn: "পুরাতন" },
        { en: "Modern", bn: "আধুনিক" },
        { en: "Ancient", bn: "প্রাচীন" },
        { en: "Beautiful", bn: "সুন্দর" },
        { en: "Mysterious", bn: "রহস্যময়" },
        { en: "Unknown", bn: "অজানা" },
        { en: "Secret", bn: "গোপন" },
    ];
    const subjects = [
        { en: "Story", bn: "গল্প" },
        { en: "Poetry", bn: "কবিতা" },
        { en: "Novel", bn: "উপন্যাস" },
        { en: "History", bn: "ইতিহাস" },
        { en: "Biography", bn: "জীবনী" },
        { en: "Travel", bn: "ভ্রমণ" },
        { en: "Science", bn: "বিজ্ঞান" },
        { en: "Philosophy", bn: "দর্শন" },
    ];
    const objects = [
        { en: "of Bengal", bn: "বাংলার" },
        { en: "of People", bn: "মানুষের" },
        { en: "of Love", bn: "প্রেমের" },
        { en: "of Life", bn: "জীবনের" },
        { en: "of Dreams", bn: "স্বপ্নের" },
        { en: "of Time", bn: "সময়ের" },
        { en: "of World", bn: "পৃথিবীর" },
        { en: "of Heart", bn: "হৃদয়ের" },
    ];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const subject = subjects[Math.floor(Math.random() * subjects.length)];
    const object = objects[Math.floor(Math.random() * objects.length)];
    return {
        en: `${prefix.en} ${object.en} ${subject.en}`,
        bn: `${prefix.bn} ${object.bn} ${subject.bn}`
    };
};
router.get("/create-products", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { count = 10000 } = req.body;
        // Get existing categories and subcategories
        const categories = yield model_1.default.find({});
        const subcategories = yield model_2.default.find({});
        if (categories.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No categories found. Please create categories first.",
            });
        }
        const sellerIds = ["694e859d805790e5093f6f47", "694e9a450114dad6fcb66e18"];
        const writerIds = ["6919c4a1f9b13b622698bb14", "694a8f02723a725a6ae21869"];
        const books = [];
        for (let i = 0; i < count; i++) {
            const randomCategory = categories[Math.floor(Math.random() * categories.length)];
            const categorySubcats = subcategories.filter((sub) => {
                var _a;
                return ((_a = sub.parentCategory) === null || _a === void 0 ? void 0 : _a.toString()) ===
                    randomCategory._id.toString();
            });
            const randomSubcategory = categorySubcats[Math.floor(Math.random() * categorySubcats.length)];
            const randomTitle = generateRandomTitle();
            const randomSeller = sellerIds[Math.floor(Math.random() * sellerIds.length)];
            const randomWriter = writerIds[Math.floor(Math.random() * writerIds.length)];
            const regularPrice = Math.floor(Math.random() * 500) + 100;
            const sellingPrice = Math.floor(regularPrice * 0.8);
            books.push({
                title: {
                    en: `${randomTitle.en}-${Date.now()}-${i}`,
                    bn: `${randomTitle.bn} - ${Date.now()}-${i}`
                },
                slug: `${randomTitle.en
                    .replace(/\s+/g, "-")
                    .toLowerCase()}-${Date.now()}-${i}`,
                description: `এটি একটি চমৎকার ${randomCategory.title} বই। লেখক অত্যন্ত দক্ষতার সাথে গল্পটি বলেছেন।`,
                shortDescription: `${randomCategory.title} বিষয়ক একটি জনপ্রিয় বই।`,
                category: randomCategory._id,
                subcategory: randomSubcategory === null || randomSubcategory === void 0 ? void 0 : randomSubcategory._id,
                writer: randomWriter,
                seller: randomSeller,
                regularPrice,
                sellingPrice,
                existingQnt: Math.floor(Math.random() * 50) + 10,
                numberOfPage: Math.floor(Math.random() * 300) + 100,
                language: "বাংলা",
                binding: "পেপারব্যাক",
                edition: `${Math.floor(Math.random() * 5) + 1}ম সংস্করণ`,
                ISBN: `978-984-${Math.floor(Math.random() * 90000) + 10000}-${Math.floor(Math.random() * 90) + 10}-${Math.floor(Math.random() * 9) + 1}`,
                display: true,
                stockStatus: "In Stock",
                orderType: "Buy_Now",
                productType: "বই",
                rating: Math.floor(Math.random() * 2) + 3.5,
                metaTitle: `${randomTitle.en}-${Date.now()}-${i} | বই কিনুন`,
                metaDescription: `${randomTitle.en}-${Date.now()}-${i} বইটি অনলাইনে কিনুন সেরা দামে।`,
                keywords: [
                    randomCategory.title,
                    (randomSubcategory === null || randomSubcategory === void 0 ? void 0 : randomSubcategory.title) || "",
                    "বাংলা বই",
                    "অনলাইন বই",
                ],
                img: "/default-book.jpg",
                affiliateEnabled: Math.random() > 0.5,
                affiliateCommissionType: Math.random() > 0.5 ? "percentage" : "fixed",
                affiliateCommission: Math.random() > 0.5
                    ? Math.floor(Math.random() * 15) + 5
                    : Math.floor(Math.random() * 50) + 10,
            });
        }
        const createdBooks = yield model_3.default.insertMany(books);
        res.json({
            success: true,
            message: `${createdBooks.length} products created successfully`,
            data: { books: createdBooks.length },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Error creating products",
            error: error.message,
        });
    }
}));
exports.default = router;
