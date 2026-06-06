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
exports.getCategoryPageData = exports.getAllForPageBuilder = exports.filterUtils = exports.getNavbarUtils = exports.getAllCatWithSubCat = exports.singleCategoryForCategoryEditPage = exports.getAllCategoriesForCatMainPage = exports.allCategoryForFiltering = exports.allCategoriesForAdminCatIndexPage = exports.productAddUtils = exports.allCategoriesForSubCatAddPage = exports.update = exports.singleForEditPage = exports.create = void 0;
const model_1 = __importDefault(require("./model"));
const generateSLug_1 = require("../shared/generateSLug");
const model_2 = __importDefault(require("../writer/model"));
const model_3 = __importDefault(require("../product/model"));
const model_4 = __importDefault(require("../subcategory/model"));
const model_5 = __importDefault(require("../user/model"));
const model_6 = __importDefault(require("../suggestion/model"));
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const item = yield model_1.default.create(Object.assign(Object.assign({}, req.body), { slug: (0, generateSLug_1.generateSlug)(req.body.title.en) }));
        // Send success message along with the created category data
        res.status(201).json({
            message: "Created successfully!",
            item,
        });
    }
    catch (error) {
        // Send error message if there was an issue
        res.status(500).json({
            message: "Failed to create.",
            error: error.message,
        });
    }
});
exports.create = create;
const singleForEditPage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const item = yield model_1.default.findOne({ _id: req.params.id });
        res.status(200).json({ message: "Category fetched successfully!", item });
    }
    catch (error) {
        console.error(error);
        res
            .status(500)
            .json({ message: "Failed to fetch Category.", error: error.message });
    }
});
exports.singleForEditPage = singleForEditPage;
// Update
const update = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const updatedItem = yield model_1.default.findByIdAndUpdate(id, Object.assign(Object.assign({}, req.body), { slug: (0, generateSLug_1.generateSlug)(req.body.title.en) }), {
            new: true, // Return the updated document
            runValidators: true, // Run validation on the updated data
        });
        if (!updatedItem) {
            return res.status(404).json({
                message: "Not found.",
            });
        }
        res.status(200).json({
            message: "Updated successfully!",
            respondedData: updatedItem,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to update.",
            error: error.message,
        });
    }
});
exports.update = update;
// Get all
const allCategoriesForSubCatAddPage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const items = yield model_1.default.find().select("title slug");
        res.status(200).json({
            message: "Fetched successfully!",
            respondedData: items.reverse(),
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to fetch.",
            error: error.message,
        });
    }
});
exports.allCategoriesForSubCatAddPage = allCategoriesForSubCatAddPage;
const productAddUtils = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Fetch both categories and subcategories concurrently
        const [categories, subcategories, sellers, writers, suggestions] = yield Promise.all([
            model_1.default.find().select("title").sort({ createdAt: -1 }),
            model_4.default.find()
                .select("title parentCategory")
                .sort({ createdAt: -1 }),
            model_5.default.find({ role: "seller" })
                .sort({ createdAt: -1 })
                .select("name image"),
            model_2.default.find().select("title img writerId").sort({ createdAt: -1 }),
            model_6.default.find().select("title").sort({ createdAt: -1 }),
        ]);
        // Attach subcategories to their parent categories
        const categoriesWithSubs = categories.map((category) => {
            const subs = subcategories.filter((sub) => { var _a; return ((_a = sub.parentCategory) === null || _a === void 0 ? void 0 : _a.toString()) === category._id.toString(); });
            return Object.assign(Object.assign({}, category.toObject()), { subcategories: subs });
        });
        res.status(200).json({
            categories: categoriesWithSubs,
            sellers: sellers,
            writers: writers,
            suggestions: suggestions,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to fetch.",
            error: error.message,
        });
    }
});
exports.productAddUtils = productAddUtils;
// Get all
const allCategoriesForAdminCatIndexPage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const items = yield model_1.default.find().select("title slug img");
        res.status(200).json({
            message: "Fetched successfully!",
            respondedData: items.reverse(),
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to fetch.",
            error: error.message,
        });
    }
});
exports.allCategoriesForAdminCatIndexPage = allCategoriesForAdminCatIndexPage;
// Get all
const allCategoryForFiltering = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const items = yield model_1.default.find().select("title");
        res.status(200).json({
            message: "Fetched successfully!",
            respondedData: items.reverse(),
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to fetch.",
            error: error.message,
        });
    }
});
exports.allCategoryForFiltering = allCategoryForFiltering;
// Get all
const getAllCategoriesForCatMainPage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const items = yield model_1.default.find();
        res.status(200).json({
            message: "Fetched successfully!",
            respondedData: items.reverse(),
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to fetch.",
            error: error.message,
        });
    }
});
exports.getAllCategoriesForCatMainPage = getAllCategoriesForCatMainPage;
// Get single
const singleCategoryForCategoryEditPage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const item = yield model_1.default.findOne({ _id: req.params.id });
        res.status(200).json({
            message: "Fetched successfully!",
            respondedData: item,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to fetch.",
            error: error.message,
        });
    }
});
exports.singleCategoryForCategoryEditPage = singleCategoryForCategoryEditPage;
const getAllCatWithSubCat = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const categories = yield model_1.default.find()
            .select("title  subcategories")
            .populate({
            path: "subcategories",
            select: "title",
        });
        res.status(200).json(categories);
    }
    catch (error) {
        console.error("Failed to fetch categories:", error);
        res
            .status(500)
            .json({ message: "Server error while fetching categories." });
    }
});
exports.getAllCatWithSubCat = getAllCatWithSubCat;
const getNavbarUtils = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [categories, writers, publishers] = yield Promise.all([
            model_1.default.find()
                .select("img title slug subcategories")
                .populate({ path: "subcategories", select: "img title slug" }),
            model_2.default.find().select("title slug"),
            model_5.default.aggregate([
                {
                    $match: {
                        isEnabledByAdmin: true,
                        role: "seller",
                    },
                },
                {
                    $addFields: {
                        title: "$sellerInfo.companyName",
                    },
                },
                {
                    $project: {
                        name: 1,
                        slug: 1,
                        image: 1,
                        sellerInfo: 1,
                        title: 1,
                    },
                },
            ]),
        ]);
        res.json({ categories, writers, publishers });
    }
    catch (err) {
        console.error("Failed to fetch common data:", err);
        res.status(500).json({ message: "Something went wrong" });
    }
});
exports.getNavbarUtils = getNavbarUtils;
// ✅ GET all categories for filter page
// ✅ GET all categories for filter page
const filterUtils = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [categories, subcategories, sellers, writers] = yield Promise.all([
            model_1.default.find({}, { _id: 1, slug: 1, title: 1, img: 1 }).sort({
                position: 1,
            }),
            model_4.default.find({}, { _id: 1, slug: 1, title: 1, img: 1, parentCategory: 1 }).sort({
                position: 1,
            }),
            model_5.default.find({ role: "seller", display: true }, { _id: 1, slug: 1, "sellerInfo.companyName": 1, image: 1, name: 1 }).sort({ createdAt: -1 }),
            model_2.default.find({}, { _id: 1, slug: 1, title: 1, img: 1 }).sort({
                createdAt: -1,
            }),
        ]);
        res.status(200).json({ categories, subcategories, sellers, writers });
    }
    catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});
exports.filterUtils = filterUtils;
const getAllForPageBuilder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const items = yield model_1.default.find()
            .select("title")
            .populate({
            path: "subcategories",
            select: "title",
        })
            .sort({ position: 1 });
        res.status(200).json(items);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to fetch.",
            error: error.message,
        });
    }
});
exports.getAllForPageBuilder = getAllForPageBuilder;
// Get all category page data in single API call
const getCategoryPageData = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { slug } = req.params;
        // Execute all queries in parallel
        const [category, writers, publishers, products] = yield Promise.all([
            model_1.default.aggregate([
                { $match: { slug } },
                {
                    $lookup: {
                        from: "subcategories",
                        localField: "subcategories",
                        foreignField: "_id",
                        as: "subcategories",
                        pipeline: [{ $project: { title: 1, slug: 1 } }],
                    },
                },
                {
                    $project: {
                        _id: 1,
                        title: 1,
                        slug: 1,
                        img: 1,
                        metaTitle: 1,
                        metaDescription: 1,
                        description: 1,
                        shortDescription: 1,
                        keywords: 1,
                        subcategories: 1,
                    },
                },
            ]).then((result) => result[0] || null),
            model_2.default.find().select("_id title slug img description").lean(),
            model_5.default.find({
                role: "seller",
                isEnabledByAdmin: true,
            }).select("name slug sellerInfo.companyName"),
            model_1.default.findOne({ slug }).then((cat) => __awaiter(void 0, void 0, void 0, function* () {
                if (cat) {
                    return model_3.default.find({
                        category: cat._id,
                        display: true,
                        isEnabledByAdmin: true,
                    })
                        .limit(20)
                        .sort({ createdAt: -1 })
                        .select("_id img title featured regularPrice sellingPrice slug");
                }
                return [];
            })),
        ]);
        res.status(200).json({
            success: true,
            message: "Category page data fetched successfully",
            data: {
                products: products.reverse() || [],
                writers: writers || [],
                category: category || null,
                publishers: publishers || [],
            },
        });
    }
    catch (error) {
        console.error("Error fetching category page data:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch category page data",
            error: error.message,
        });
    }
});
exports.getCategoryPageData = getCategoryPageData;
