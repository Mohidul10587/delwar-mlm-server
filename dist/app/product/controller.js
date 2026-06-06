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
exports.forUserDetails = exports.getAffiliateProducts = exports.getAllSlugs = exports.deleteById = exports.singleForEdit = exports.allForAdminIndex = exports.update = exports.create = void 0;
const model_1 = require("./model");
const slugify_1 = __importDefault(require("slugify"));
//===================== Admin Controllers =====================
const create = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        if (!req.body.slug && ((_a = req.body.title) === null || _a === void 0 ? void 0 : _a.en)) {
            req.body.slug = (0, slugify_1.default)(req.body.title.en, { lower: true, strict: true });
        }
        const item = yield model_1.Product.create(req.body);
        res.status(201).json({
            message: {
                en: "Product created successfully!",
                bn: "Product সফলভাবে তৈরি হয়েছে!",
            },
            item,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.create = create;
const update = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const item = yield model_1.Product.findByIdAndUpdate(id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!item)
            return res.status(404).json({
                message: { en: "Product not found.", bn: "Product পাওয়া যায়নি।" },
            });
        res.status(200).json({
            message: {
                en: "Product updated successfully!",
                bn: "Product সফলভাবে আপডেট হয়েছে!",
            },
            item,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.update = update;
const allForAdminIndex = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || "";
        const skip = (page - 1) * limit;
        const searchQuery = search
            ? { "title.en": { $regex: search, $options: "i" } }
            : {};
        const [items, total] = yield Promise.all([
            model_1.Product.find(searchQuery)
                .select("title img regularPrice salePrice type category")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            model_1.Product.countDocuments(searchQuery),
        ]);
        res.status(200).json({
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    }
    catch (error) {
        next(error);
    }
});
exports.allForAdminIndex = allForAdminIndex;
const singleForEdit = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const item = yield model_1.Product.findOne({ _id: req.params.id });
        res.status(200).json(item);
    }
    catch (error) {
        next(error);
    }
});
exports.singleForEdit = singleForEdit;
const deleteById = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const item = yield model_1.Product.findByIdAndDelete(id);
        if (!item)
            return res.status(404).json({
                message: { en: "Product not found.", bn: "Product পাওয়া যায়নি।" },
            });
        res.status(200).json({
            message: {
                en: "Product deleted successfully!",
                bn: "Product সফলভাবে মুছে ফেলা হয়েছে!",
            },
        });
    }
    catch (error) {
        next(error);
    }
});
exports.deleteById = deleteById;
// ================== User Controllers ======================
const getAllSlugs = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const slugs = yield model_1.Product.find({ isEnabledByAdmin: true })
            .select("slug")
            .lean();
        res.status(200).json(slugs);
    }
    catch (error) {
        next(error);
    }
});
exports.getAllSlugs = getAllSlugs;
const getAffiliateProducts = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const items = yield model_1.Product.find({
            isEnabledByAdmin: true,
            isAffiliate: true,
        })
            .select("title slug img regularPrice salePrice affCommPercent type category")
            .sort({ createdAt: -1 })
            .lean();
        res.status(200).json(items);
    }
    catch (error) {
        next(error);
    }
});
exports.getAffiliateProducts = getAffiliateProducts;
const forUserDetails = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const item = yield model_1.Product.findOne({
            slug: req.params.slug,
            isEnabledByAdmin: true,
        });
        if (!item) {
            return res.status(404).json({
                message: {
                    en: "Oops! Product not found.",
                    bn: "ওহ! Product পাওয়া যায়নি।",
                },
                item: null,
            });
        }
        const subcategoryProducts = ((_a = item.subcategory) === null || _a === void 0 ? void 0 : _a.id)
            ? yield model_1.Product.aggregate([
                {
                    $match: {
                        "subcategory.id": item.subcategory.id,
                        _id: { $ne: item._id },
                        isEnabledByAdmin: true,
                    },
                },
                { $sample: { size: 20 } },
                {
                    $project: {
                        title: 1,
                        slug: 1,
                        img: { $arrayElemAt: ["$img", 0] },
                        regularPrice: 1,
                        salePrice: 1,
                        deliveryChargeOutsideDhaka: 1,
                        deliveryChargeInsideDhaka: 1,
                    },
                },
            ])
            : [];
        res.status(200).json({
            item,
            sidebarProducts: subcategoryProducts.slice(0, 10),
            bottomProducts: subcategoryProducts.slice(10, 20),
        });
    }
    catch (error) {
        next(error);
    }
});
exports.forUserDetails = forUserDetails;
