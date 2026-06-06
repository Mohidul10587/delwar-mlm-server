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
Object.defineProperty(exports, "__esModule", { value: true });
exports.allForUserIndex = exports.getProductTypes = void 0;
const model_1 = require("./model");
const model_2 = require("../classification/model");
const productTypes = [
    /* ===================== 1. Fashion ===================== */
    {
        id: "pt-3",
        title: { en: "Fashion", bn: "ফ্যাশন" },
        slug: "fashion",
        image: "/images/fashion.jpg",
        categories: [
            {
                id: "cat-3",
                title: { en: "Men", bn: "পুরুষ" },
                slug: "men",
                image: "/images/men.jpg",
                subCategories: [
                    {
                        id: "subcat-3",
                        title: { en: "Shirt", bn: "শার্ট" },
                        slug: "shirt",
                        image: "/images/shirt.jpg",
                        brands: [],
                    },
                    {
                        id: "subcat-3-pant",
                        title: { en: "Pant", bn: "প্যান্ট" },
                        slug: "pant",
                        image: "/images/pant.jpg",
                        brands: [],
                    },
                    {
                        id: "subcat-3-tshirt",
                        title: { en: "T-Shirt", bn: "টি-শার্ট" },
                        slug: "t-shirt",
                        image: "/images/t-shirt.jpg",
                        brands: [],
                    },
                    {
                        id: "subcat-3-jacket",
                        title: { en: "Jacket", bn: "জ্যাকেট" },
                        slug: "jacket",
                        image: "/images/jacket.jpg",
                        brands: [],
                    },
                    {
                        id: "subcat-3-shoes",
                        title: { en: "Shoes", bn: "জুতা" },
                        slug: "men-shoes",
                        image: "/images/men-shoes.jpg",
                        brands: [],
                    },
                    {
                        id: "subcat-3-underwear",
                        title: { en: "Underwear", bn: "আন্ডারওয়্যার" },
                        slug: "men-underwear",
                        image: "/images/men-underwear.jpg",
                        brands: [],
                    },
                    {
                        id: "subcat-3-shorts",
                        title: { en: "Shorts", bn: "শর্টস" },
                        slug: "men-shorts",
                        image: "/images/men-shorts.jpg",
                        brands: [],
                    },
                    {
                        id: "subcat-3-sweater",
                        title: { en: "Sweater", bn: "সোয়েটার" },
                        slug: "men-sweater",
                        image: "/images/men-sweater.jpg",
                        brands: [],
                    },
                    {
                        id: "subcat-3-hoodie",
                        title: { en: "Hoodie", bn: "হুডি" },
                        slug: "men-hoodie",
                        image: "/images/men-hoodie.jpg",
                        brands: [],
                    },
                    {
                        id: "subcat-3-formal",
                        title: { en: "Formal Suit", bn: "ফর্মাল স্যুট" },
                        slug: "men-formal-suit",
                        image: "/images/men-formal-suit.jpg",
                        brands: [],
                    },
                    {
                        id: "subcat-3-belt",
                        title: { en: "Belt", bn: "বেল্ট" },
                        slug: "men-belt",
                        image: "/images/men-belt.jpg",
                        brands: [],
                    },
                    {
                        id: "subcat-3-cap",
                        title: { en: "Cap", bn: "ক্যাপ" },
                        slug: "men-cap",
                        image: "/images/men-cap.jpg",
                        brands: [],
                    },
                ],
            },
            {
                id: "cat-3w",
                title: { en: "Women", bn: "মহিলা" },
                slug: "women",
                image: "/images/women.jpg",
                subCategories: [
                    {
                        id: "subcat-3w",
                        title: { en: "Dress", bn: "পোশাক" },
                        slug: "dress",
                        image: "/images/dress.jpg",
                        brands: [],
                    },
                    {
                        id: "subcat-3w-cosmetics",
                        title: { en: "Cosmetics", bn: "কসমেটিক্স" },
                        slug: "cosmetics",
                        image: "/images/cosmetics.jpg",
                        brands: [],
                    },
                    {
                        id: "subcat-3w-shari",
                        title: { en: "Shari", bn: "শাড়ি" },
                        slug: "shari",
                        image: "/images/shari.jpg",
                        brands: [],
                    },
                    {
                        id: "subcat-3w-tops",
                        title: { en: "Tops", bn: "টপস" },
                        slug: "women-tops",
                        image: "/images/women-tops.jpg",
                        brands: [],
                    },
                    {
                        id: "subcat-3w-kurti",
                        title: { en: "Kurti", bn: "কুর্তি" },
                        slug: "kurti",
                        image: "/images/kurti.jpg",
                        brands: [],
                    },
                    {
                        id: "subcat-3w-shoes",
                        title: { en: "Shoes", bn: "জুতা" },
                        slug: "women-shoes",
                        image: "/images/women-shoes.jpg",
                        brands: [],
                    },
                    {
                        id: "subcat-3w-bag",
                        title: { en: "Bag", bn: "ব্যাগ" },
                        slug: "women-bag",
                        image: "/images/women-bag.jpg",
                        brands: [],
                    },
                    {
                        id: "subcat-3w-hijab",
                        title: { en: "Hijab", bn: "হিজাব" },
                        slug: "hijab",
                        image: "/images/hijab.jpg",
                        brands: [],
                    },
                    {
                        id: "subcat-3w-salwar",
                        title: { en: "Salwar Kameez", bn: "সালোয়ার কামিজ" },
                        slug: "salwar-kameez",
                        image: "/images/salwar-kameez.jpg",
                        brands: [],
                    },
                    {
                        id: "subcat-3w-leggings",
                        title: { en: "Leggings", bn: "লেগিংস" },
                        slug: "leggings",
                        image: "/images/leggings.jpg",
                        brands: [],
                    },
                    {
                        id: "subcat-3w-jewelry",
                        title: { en: "Jewelry", bn: "গহনা" },
                        slug: "women-jewelry",
                        image: "/images/women-jewelry.jpg",
                        brands: [],
                    },
                    {
                        id: "subcat-3w-sweater",
                        title: { en: "Sweater", bn: "সোয়েটার" },
                        slug: "women-sweater",
                        image: "/images/women-sweater.jpg",
                        brands: [],
                    },
                    {
                        id: "subcat-3w-nightwear",
                        title: { en: "Nightwear", bn: "নাইটওয়্যার" },
                        slug: "women-nightwear",
                        image: "/images/women-nightwear.jpg",
                        brands: [],
                    },
                ],
            },
        ],
    },
    /* ===================== 2. Computer & Accessories ===================== */
    {
        id: "pt-4",
        title: { en: "Computer & Accessories", bn: "কম্পিউটার ও এক্সেসরিজ" },
        slug: "computer-accessories",
        image: "/images/computer-accessories.jpg",
        categories: [
            {
                id: "cat-4",
                title: { en: "Laptop", bn: "ল্যাপটপ" },
                slug: "laptop",
                image: "/images/laptop.jpg",
                subCategories: [
                    {
                        id: "subcat-4",
                        title: { en: "Gaming Laptop", bn: "গেমিং ল্যাপটপ" },
                        slug: "gaming-laptop",
                        image: "/images/gaming-laptop.jpg",
                        brands: [
                            {
                                id: "brand-5",
                                title: { en: "ASUS", bn: "আসুস" },
                                slug: "asus",
                                image: "/images/asus.jpg",
                                models: [
                                    {
                                        id: "model-7",
                                        title: { en: "ROG Strix G16", bn: "আরওজি স্ট্রিক্স জি১৬" },
                                        slug: "rog-strix-g16",
                                        image: "/images/rog-strix-g16.jpg",
                                    },
                                    {
                                        id: "model-8",
                                        title: { en: "TUF F15", bn: "টাফ এফ১৫" },
                                        slug: "tuf-f15",
                                        image: "/images/tuf-f15.jpg",
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    },
    /* ===================== 3. Automobile ===================== */
    {
        id: "pt-5",
        title: { en: "Automobile", bn: "অটোমোবাইল" },
        slug: "automobile",
        image: "/images/automobile.jpg",
        categories: [
            {
                id: "cat-5",
                title: { en: "Motorcycle", bn: "মোটরসাইকেল" },
                slug: "motorcycle",
                image: "/images/motorcycle.jpg",
                subCategories: [
                    {
                        id: "subcat-5",
                        title: { en: "Sports Bike", bn: "স্পোর্টস বাইক" },
                        slug: "sports-bike",
                        image: "/images/sports-bike.jpg",
                        brands: [
                            {
                                id: "brand-6",
                                title: { en: "Yamaha", bn: "ইয়ামাহা" },
                                slug: "yamaha",
                                image: "/images/yamaha.jpg",
                                models: [
                                    {
                                        id: "model-9",
                                        title: { en: "R15 V4", bn: "আর১৫ ভি৪" },
                                        slug: "r15-v4",
                                        image: "/images/r15-v4.jpg",
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    },
    /* ===================== 4. Furniture ===================== */
    {
        id: "pt-6",
        title: { en: "Furniture", bn: "ফার্নিচার" },
        slug: "furniture",
        image: "/images/furniture.jpg",
        categories: [
            {
                id: "cat-6",
                title: { en: "Living Room", bn: "লিভিং রুম" },
                slug: "living-room",
                image: "/images/living-room.jpg",
                subCategories: [
                    {
                        id: "subcat-6",
                        title: { en: "Sofa", bn: "সোফা" },
                        slug: "sofa",
                        image: "/images/sofa.jpg",
                        brands: [
                            {
                                id: "brand-7",
                                title: { en: "Otobi", bn: "ওটোবি" },
                                slug: "otobi",
                                image: "/images/otobi.jpg",
                            },
                        ],
                    },
                ],
            },
        ],
    },
    /* ===================== 5. Books & Stationery ===================== */
    {
        id: "pt-7",
        title: { en: "Books & Stationery", bn: "বই ও স্টেশনারি" },
        slug: "books-stationery",
        image: "/images/books-stationery.jpg",
        categories: [
            {
                id: "cat-7",
                title: { en: "Academic Books", bn: "একাডেমিক বই" },
                slug: "academic-books",
                image: "/images/academic-books.jpg",
                subCategories: [
                    {
                        id: "subcat-7",
                        title: { en: "Computer Science", bn: "কম্পিউটার সায়েন্স" },
                        slug: "computer-science",
                        image: "/images/computer-science.jpg",
                        brands: [
                            {
                                id: "brand-8",
                                title: { en: "O'Reilly", bn: "ওরেইলি" },
                                slug: "oreilly",
                                image: "/images/oreilly.jpg",
                            },
                        ],
                    },
                ],
            },
        ],
    },
    /* ===================== 6. Electronics ===================== */
    {
        id: "pt-8",
        title: { en: "Electronics", bn: "ইলেকট্রনিক্স" },
        slug: "electronics",
        image: "/images/electronics.jpg",
        categories: [
            {
                id: "cat-8",
                title: { en: "Mobile", bn: "মোবাইল" },
                slug: "mobile",
                image: "/images/mobile.jpg",
                subCategories: [
                    {
                        id: "subcat-8",
                        title: { en: "Smartphone", bn: "স্মার্টফোন" },
                        slug: "smartphone",
                        image: "/images/smartphone.jpg",
                        brands: [
                            {
                                id: "brand-9",
                                title: { en: "Samsung", bn: "স্যামসাং" },
                                slug: "samsung",
                                image: "/images/samsung.jpg",
                                models: [
                                    {
                                        id: "model-12",
                                        title: { en: "Galaxy S24", bn: "গ্যালাক্সি এস২৪" },
                                        slug: "galaxy-s24",
                                        image: "/images/galaxy-s24.jpg",
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    },
    /* ===================== 7. Home Appliances ===================== */
    {
        id: "pt-9",
        title: { en: "Home Appliances", bn: "হোম অ্যাপ্লায়েন্স" },
        slug: "home-appliances",
        image: "/images/home-appliances.jpg",
        categories: [
            {
                id: "cat-9",
                title: { en: "Kitchen", bn: "রান্নাঘর" },
                slug: "kitchen",
                image: "/images/kitchen.jpg",
                subCategories: [
                    {
                        id: "subcat-9",
                        title: { en: "Refrigerator", bn: "রেফ্রিজারেটর" },
                        slug: "refrigerator",
                        image: "/images/refrigerator.jpg",
                        brands: [
                            {
                                id: "brand-10",
                                title: { en: "Walton", bn: "ওয়ালটন" },
                                slug: "walton",
                                image: "/images/walton.jpg",
                                models: [
                                    {
                                        id: "model-13",
                                        title: { en: "Frost Free 350L", bn: "ফ্রস্ট ফ্রি ৩৫০এল" },
                                        slug: "frost-free-350l",
                                        image: "/images/frost-free-350l.jpg",
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    },
    /* ===================== 8. Sports & Fitness ===================== */
    {
        id: "pt-10",
        title: { en: "Sports & Fitness", bn: "স্পোর্টস ও ফিটনেস" },
        slug: "sports-fitness",
        image: "/images/sports-fitness.jpg",
        categories: [
            {
                id: "cat-10",
                title: { en: "Gym Equipment", bn: "জিম ইকুইপমেন্ট" },
                slug: "gym-equipment",
                image: "/images/gym-equipment.jpg",
                subCategories: [
                    {
                        id: "subcat-10",
                        title: { en: "Treadmill", bn: "ট্রেডমিল" },
                        slug: "treadmill",
                        image: "/images/treadmill.jpg",
                        brands: [
                            {
                                id: "brand-11",
                                title: { en: "Powermax", bn: "পাওয়ারম্যাক্স" },
                                slug: "powermax",
                                image: "/images/powermax.jpg",
                                models: [
                                    {
                                        id: "model-14",
                                        title: { en: "TDM-100", bn: "টিডিএম-১০০" },
                                        slug: "tdm-100",
                                        image: "/images/tdm-100.jpg",
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    },
    /* ===================== 9. Beauty & Personal Care ===================== */
    {
        id: "pt-11",
        title: { en: "Beauty & Personal Care", bn: "বিউটি ও পার্সোনাল কেয়ার" },
        slug: "beauty-personal-care",
        image: "/images/beauty-personal-care.jpg",
        categories: [
            {
                id: "cat-11",
                title: { en: "Skincare", bn: "স্কিনকেয়ার" },
                slug: "skincare",
                image: "/images/skincare.jpg",
                subCategories: [
                    {
                        id: "subcat-11",
                        title: { en: "Face Cream", bn: "ফেস ক্রিম" },
                        slug: "face-cream",
                        image: "/images/face-cream.jpg",
                        brands: [
                            {
                                id: "brand-12",
                                title: { en: "Ponds", bn: "পন্ডস" },
                                slug: "ponds",
                                image: "/images/ponds.jpg",
                            },
                        ],
                    },
                ],
            },
        ],
    },
    /* ===================== 10. Toys & Games ===================== */
    {
        id: "pt-12",
        title: { en: "Toys & Games", bn: "খেলনা ও গেমস" },
        slug: "toys-games",
        image: "/images/toys-games.jpg",
        categories: [
            {
                id: "cat-12",
                title: { en: "Action Figures", bn: "অ্যাকশন ফিগার" },
                slug: "action-figures",
                image: "/images/action-figures.jpg",
                subCategories: [
                    {
                        id: "subcat-12",
                        title: { en: "Superhero", bn: "সুপারহিরো" },
                        slug: "superhero",
                        image: "/images/superhero.jpg",
                        brands: [
                            {
                                id: "brand-13",
                                title: { en: "Marvel", bn: "মার্ভেল" },
                                slug: "marvel",
                                image: "/images/marvel.jpg",
                            },
                        ],
                    },
                ],
            },
        ],
    },
    /* ===================== 11. Jewelry & Watches ===================== */
    {
        id: "pt-13",
        title: { en: "Jewelry & Watches", bn: "জুয়েলারি ও ঘড়ি" },
        slug: "jewelry-watches",
        image: "/images/jewelry-watches.jpg",
        categories: [
            {
                id: "cat-13",
                title: { en: "Watches", bn: "ঘড়ি" },
                slug: "watches",
                image: "/images/watches.jpg",
                subCategories: [
                    {
                        id: "subcat-13",
                        title: { en: "Smart Watch", bn: "স্মার্ট ওয়াচ" },
                        slug: "smart-watch",
                        image: "/images/smart-watch.jpg",
                        brands: [
                            {
                                id: "brand-14",
                                title: { en: "Apple", bn: "অ্যাপল" },
                                slug: "apple",
                                image: "/images/apple.jpg",
                                models: [
                                    {
                                        id: "model-17",
                                        title: { en: "Watch Series 9", bn: "ওয়াচ সিরিজ ৯" },
                                        slug: "watch-series-9",
                                        image: "/images/watch-series-9.jpg",
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    },
    /* ===================== 12. Food & Beverages ===================== */
    {
        id: "pt-14",
        title: { en: "Food & Beverages", bn: "খাদ্য ও পানীয়" },
        slug: "food-beverages",
        image: "/images/food-beverages.jpg",
        categories: [
            {
                id: "cat-14",
                title: { en: "Snacks", bn: "স্ন্যাকস" },
                slug: "snacks",
                image: "/images/snacks.jpg",
                subCategories: [
                    {
                        id: "subcat-14",
                        title: { en: "Chips", bn: "চিপস" },
                        slug: "chips",
                        image: "/images/chips.jpg",
                        brands: [
                            {
                                id: "brand-15",
                                title: { en: "Pran", bn: "প্রাণ" },
                                slug: "pran",
                                image: "/images/pran.jpg",
                            },
                        ],
                    },
                ],
            },
        ],
    },
    /* ===================== 13. Health & Wellness ===================== */
    {
        id: "pt-15",
        title: { en: "Health & Wellness", bn: "স্বাস্থ্য ও সুস্থতা" },
        slug: "health-wellness",
        image: "/images/health-wellness.jpg",
        categories: [
            {
                id: "cat-15",
                title: { en: "Supplements", bn: "সাপ্লিমেন্ট" },
                slug: "supplements",
                image: "/images/supplements.jpg",
                subCategories: [
                    {
                        id: "subcat-15",
                        title: { en: "Vitamins", bn: "ভিটামিন" },
                        slug: "vitamins",
                        image: "/images/vitamins.jpg",
                        brands: [
                            {
                                id: "brand-16",
                                title: { en: "Square", bn: "স্কয়ার" },
                                slug: "square",
                                image: "/images/square.jpg",
                            },
                        ],
                    },
                ],
            },
        ],
    },
    /* ===================== 14. Pet Supplies ===================== */
    {
        id: "pt-16",
        title: { en: "Pet Supplies", bn: "পোষা প্রাণীর সামগ্রী" },
        slug: "pet-supplies",
        image: "/images/pet-supplies.jpg",
        categories: [
            {
                id: "cat-16",
                title: { en: "Dog Food", bn: "কুকুরের খাবার" },
                slug: "dog-food",
                image: "/images/dog-food.jpg",
                subCategories: [
                    {
                        id: "subcat-16",
                        title: { en: "Dry Food", bn: "শুকনো খাবার" },
                        slug: "dry-food",
                        image: "/images/dry-food.jpg",
                        brands: [
                            {
                                id: "brand-17",
                                title: { en: "Pedigree", bn: "পেডিগ্রি" },
                                slug: "pedigree",
                                image: "/images/pedigree.jpg",
                            },
                        ],
                    },
                ],
            },
        ],
    },
    /* ===================== 15. Musical Instruments ===================== */
    {
        id: "pt-17",
        title: { en: "Musical Instruments", bn: "বাদ্যযন্ত্র" },
        slug: "musical-instruments",
        image: "/images/musical-instruments.jpg",
        categories: [
            {
                id: "cat-17",
                title: { en: "Guitar", bn: "গিটার" },
                slug: "guitar",
                image: "/images/guitar.jpg",
                subCategories: [
                    {
                        id: "subcat-17",
                        title: { en: "Acoustic Guitar", bn: "অ্যাকোস্টিক গিটার" },
                        slug: "acoustic-guitar",
                        image: "/images/acoustic-guitar.jpg",
                        brands: [
                            {
                                id: "brand-18",
                                title: { en: "Yamaha", bn: "ইয়ামাহা" },
                                slug: "yamaha-guitar",
                                image: "/images/yamaha-guitar.jpg",
                                models: [
                                    {
                                        id: "model-21",
                                        title: { en: "F310", bn: "এফ৩১০" },
                                        slug: "f310",
                                        image: "/images/f310.jpg",
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    },
    /* ===================== 16. Gift ===================== */
    {
        id: "pt-18",
        title: { en: "Gift", bn: "উপহার" },
        slug: "gift",
        image: "/images/gift.jpg",
        categories: [
            {
                id: "cat-18",
                title: { en: "Occasion Gifts", bn: "উপলক্ষ উপহার" },
                slug: "occasion-gifts",
                image: "/images/occasion-gifts.jpg",
                subCategories: [
                    {
                        id: "subcat-18-birthday",
                        title: { en: "Birthday", bn: "জন্মদিন" },
                        slug: "birthday-gifts",
                        image: "/images/birthday-gifts.jpg",
                        brands: [],
                    },
                    {
                        id: "subcat-18-wedding",
                        title: { en: "Wedding", bn: "বিবাহ" },
                        slug: "wedding-gifts",
                        image: "/images/wedding-gifts.jpg",
                        brands: [],
                    },
                    {
                        id: "subcat-18-eid",
                        title: { en: "Eid", bn: "ঈদ" },
                        slug: "eid-gifts",
                        image: "/images/eid-gifts.jpg",
                        brands: [],
                    },
                    {
                        id: "subcat-18-corporate",
                        title: { en: "Corporate", bn: "কর্পোরেট" },
                        slug: "corporate-gifts",
                        image: "/images/corporate-gifts.jpg",
                        brands: [],
                    },
                ],
            },
            {
                id: "cat-18-personal",
                title: { en: "Personal Gifts", bn: "ব্যক্তিগত উপহার" },
                slug: "personal-gifts",
                image: "/images/personal-gifts.jpg",
                subCategories: [
                    {
                        id: "subcat-18-flowers",
                        title: { en: "Flowers", bn: "ফুল" },
                        slug: "flowers",
                        image: "/images/flowers.jpg",
                        brands: [],
                    },
                    {
                        id: "subcat-18-chocolate",
                        title: { en: "Chocolate", bn: "চকলেট" },
                        slug: "chocolate",
                        image: "/images/chocolate.jpg",
                        brands: [],
                    },
                    {
                        id: "subcat-18-perfume",
                        title: { en: "Perfume", bn: "পারফিউম" },
                        slug: "gift-perfume",
                        image: "/images/gift-perfume.jpg",
                        brands: [],
                    },
                    {
                        id: "subcat-18-card",
                        title: { en: "Greeting Card", bn: "গ্রিটিং কার্ড" },
                        slug: "greeting-card",
                        image: "/images/greeting-card.jpg",
                        brands: [],
                    },
                ],
            },
            {
                id: "cat-18-kids",
                title: { en: "Kids Gifts", bn: "শিশু উপহার" },
                slug: "kids-gifts",
                image: "/images/kids-gifts.jpg",
                subCategories: [
                    {
                        id: "subcat-18-toys",
                        title: { en: "Toys", bn: "খেলনা" },
                        slug: "gift-toys",
                        image: "/images/gift-toys.jpg",
                        brands: [],
                    },
                    {
                        id: "subcat-18-stationery",
                        title: { en: "Stationery", bn: "স্টেশনারি" },
                        slug: "gift-stationery",
                        image: "/images/gift-stationery.jpg",
                        brands: [],
                    },
                    {
                        id: "subcat-18-books",
                        title: { en: "Books", bn: "বই" },
                        slug: "gift-books",
                        image: "/images/gift-books.jpg",
                        brands: [],
                    },
                ],
            },
            {
                id: "cat-18-hamper",
                title: { en: "Gift Hampers", bn: "গিফট হ্যাম্পার" },
                slug: "gift-hampers",
                image: "/images/gift-hampers.jpg",
                subCategories: [
                    {
                        id: "subcat-18-food-hamper",
                        title: { en: "Food Hamper", bn: "ফুড হ্যাম্পার" },
                        slug: "food-hamper",
                        image: "/images/food-hamper.jpg",
                        brands: [],
                    },
                    {
                        id: "subcat-18-luxury-hamper",
                        title: { en: "Luxury Hamper", bn: "লাক্সারি হ্যাম্পার" },
                        slug: "luxury-hamper",
                        image: "/images/luxury-hamper.jpg",
                        brands: [],
                    },
                ],
            },
        ],
    },
];
const filterProductTypesByAvailability = () => __awaiter(void 0, void 0, void 0, function* () {
    const [products, productTypes] = yield Promise.all([
        model_1.Product.find({ isEnabledByAdmin: true }).select("type category subcategory brand productModel"),
        model_2.ProductType.find().lean(),
    ]);
    const availableTypeSlugs = new Set();
    const availableCategorySlugs = new Set();
    const availableSubcategorySlugs = new Set();
    const availableBrandSlugs = new Set();
    const availableModelSlugs = new Set();
    products.forEach((product) => {
        var _a, _b, _c, _d, _e;
        if ((_a = product.type) === null || _a === void 0 ? void 0 : _a.slug)
            availableTypeSlugs.add(product.type.slug);
        if ((_b = product.category) === null || _b === void 0 ? void 0 : _b.slug)
            availableCategorySlugs.add(product.category.slug);
        if ((_c = product.subcategory) === null || _c === void 0 ? void 0 : _c.slug)
            availableSubcategorySlugs.add(product.subcategory.slug);
        if ((_d = product.brand) === null || _d === void 0 ? void 0 : _d.slug)
            availableBrandSlugs.add(product.brand.slug);
        if ((_e = product.productModel) === null || _e === void 0 ? void 0 : _e.slug)
            availableModelSlugs.add(product.productModel.slug);
    });
    return productTypes
        .filter((type) => availableTypeSlugs.has(type.slug))
        .map((type) => (Object.assign(Object.assign({}, type), { categories: type.categories
            .filter((cat) => availableCategorySlugs.has(cat.slug))
            .map((cat) => (Object.assign(Object.assign({}, cat), { subCategories: cat.subCategories
                .filter((sub) => availableSubcategorySlugs.has(sub.slug))
                .map((sub) => (Object.assign(Object.assign({}, sub), { brands: sub.brands
                    .filter((brand) => availableBrandSlugs.has(brand.slug))
                    .map((brand) => {
                    var _a;
                    return (Object.assign(Object.assign({}, brand), { models: (_a = brand.models) === null || _a === void 0 ? void 0 : _a.filter((model) => availableModelSlugs.has(model.slug)) }));
                }) }))) }))) })));
});
const getProductTypes = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const productTypes = yield model_2.ProductType.find().sort({ createdAt: 1 }).lean();
        res.status(200).json({ productTypes });
    }
    catch (error) {
        next(error);
    }
});
exports.getProductTypes = getProductTypes;
const allForUserIndex = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const search = req.query.search || "";
        const typeSlugs = req.query.typeSlugs
            ? req.query.typeSlugs.split("--")
            : [];
        const categorySlugs = req.query.categorySlugs
            ? req.query.categorySlugs.split("--")
            : [];
        const subcategorySlugs = req.query.subcategorySlugs
            ? req.query.subcategorySlugs.split("--")
            : [];
        const brandSlugs = req.query.brandSlugs
            ? req.query.brandSlugs.split("--")
            : [];
        const modelSlugs = req.query.modelSlugs
            ? req.query.modelSlugs.split("--")
            : [];
        const skip = (page - 1) * limit;
        const query = { isEnabledByAdmin: true };
        if (search)
            query["title.en"] = { $regex: search, $options: "i" };
        if (typeSlugs.length)
            query["type.slug"] = { $in: typeSlugs };
        if (categorySlugs.length)
            query["category.slug"] = { $in: categorySlugs };
        if (subcategorySlugs.length)
            query["subcategory.slug"] = { $in: subcategorySlugs };
        if (brandSlugs.length)
            query["brand.slug"] = { $in: brandSlugs };
        if (modelSlugs.length)
            query["productModel.slug"] = { $in: modelSlugs };
        const [items, total] = yield Promise.all([
            model_1.Product.find(query)
                .select("title slug img regularPrice salePrice type category subcategory deliveryChargeInsideDhaka deliveryChargeOutsideDhaka")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            model_1.Product.countDocuments(query),
        ]);
        const filteredProductTypes = yield filterProductTypesByAvailability();
        res.status(200).json({
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            productTypes: filteredProductTypes,
        });
    }
    catch (error) {
        console.error("Error in allForUserIndex:", error);
        next(error);
    }
});
exports.allForUserIndex = allForUserIndex;
