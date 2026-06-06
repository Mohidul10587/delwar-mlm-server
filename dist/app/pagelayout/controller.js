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
exports.getSectionProducts = exports.remove = exports.update = exports.create = exports.getById = exports.getBySlug = exports.getAll = void 0;
const model_1 = require("./model");
const model_2 = require("../product/model");
const model_3 = require("../classification/model");
const getAll = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const layouts = yield model_1.PageLayout.find()
            .select("title slug createdAt")
            .sort({ createdAt: -1 })
            .lean();
        res.json({ layouts });
    }
    catch (err) {
        next(err);
    }
});
exports.getAll = getAll;
const getBySlug = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const layout = yield model_1.PageLayout.findOne({ slug: req.params.slug }).lean();
        if (!layout)
            return res.status(404).json({ message: "Not found" });
        const sections = yield Promise.all(layout.sections.map((sec) => __awaiter(void 0, void 0, void 0, function* () {
            const s = Object.assign({}, sec);
            if (sec.type === "CategoryProductRow" && sec.category) {
                s.products = yield model_2.Product.aggregate([
                    { $match: { "category.id": sec.category, isEnabledByAdmin: true } },
                    { $sample: { size: sec.limit || 10 } },
                    {
                        $project: {
                            title: 1,
                            slug: 1,
                            img: 1,
                            regularPrice: 1,
                            salePrice: 1,
                            deliveryChargeOutsideDhaka: 1,
                            deliveryChargeInsideDhaka: 1,
                        },
                    },
                ]);
            }
            if (sec.type === "SubCategoryProductRow" && sec.subCategory) {
                s.products = yield model_2.Product.aggregate([
                    {
                        $match: {
                            "subcategory.id": sec.subCategory,
                            isEnabledByAdmin: true,
                        },
                    },
                    { $sample: { size: sec.limit || 10 } },
                    {
                        $project: {
                            title: 1,
                            slug: 1,
                            img: 1,
                            regularPrice: 1,
                            salePrice: 1,
                            deliveryChargeOutsideDhaka: 1,
                            deliveryChargeInsideDhaka: 1,
                        },
                    },
                ]);
            }
            if (sec.type === "BrandProductRow" && sec.brand) {
                s.products = yield model_2.Product.aggregate([
                    { $match: { "brand.id": sec.brand, isEnabledByAdmin: true } },
                    { $sample: { size: sec.limit || 10 } },
                    {
                        $project: {
                            title: 1,
                            slug: 1,
                            img: 1,
                            regularPrice: 1,
                            salePrice: 1,
                            deliveryChargeOutsideDhaka: 1,
                            deliveryChargeInsideDhaka: 1,
                        },
                    },
                ]);
            }
            if (sec.type === "TopSellingProducts") {
                s.products = yield model_2.Product.find({ isEnabledByAdmin: true })
                    .select("title slug img regularPrice salePrice")
                    .sort({ sold: -1 })
                    .limit(sec.limit || 4)
                    .lean();
            }
            if (sec.type === "JustForYou") {
                s.products = yield model_2.Product.aggregate([
                    { $match: { isEnabledByAdmin: true } },
                    { $sample: { size: sec.limit || 10 } },
                    {
                        $project: {
                            title: 1,
                            slug: 1,
                            img: 1,
                            regularPrice: 1,
                            salePrice: 1,
                            deliveryChargeOutsideDhaka: 1,
                            deliveryChargeInsideDhaka: 1,
                        },
                    },
                ]);
            }
            if (sec.type === "ProductType") {
                const types = yield model_3.ProductType.find()
                    .select("id title slug image")
                    .lean();
                s.productTypes = types.map((t) => {
                    var _a;
                    return ({
                        id: t.id || t._id,
                        title: t.title,
                        slug: t.slug,
                        image: (_a = t.image) !== null && _a !== void 0 ? _a : "",
                    });
                });
            }
            if (sec.type === "ProductCategories") {
                const types = yield model_3.ProductType.find().select("categories").lean();
                s.categories = types
                    .flatMap((t) => { var _a; return (_a = t.categories) !== null && _a !== void 0 ? _a : []; })
                    .map((c) => {
                    var _a;
                    return ({
                        title: c.title,
                        slug: c.slug,
                        img: (_a = c.image) !== null && _a !== void 0 ? _a : "",
                    });
                });
            }
            if (sec.type === "ProductSubCategory") {
                const types = yield model_3.ProductType.find().select("categories").lean();
                s.categories = types
                    .flatMap((t) => { var _a; return ((_a = t.categories) !== null && _a !== void 0 ? _a : []).flatMap((c) => { var _a; return (_a = c.subCategories) !== null && _a !== void 0 ? _a : []; }); })
                    .map((sub) => {
                    var _a;
                    return ({
                        title: sub.title,
                        slug: sub.slug,
                        img: (_a = sub.image) !== null && _a !== void 0 ? _a : "",
                    });
                });
            }
            if (sec.type === "ProductBrand") {
                const types = yield model_3.ProductType.find().select("categories").lean();
                s.brands = types
                    .flatMap((t) => {
                    var _a;
                    return ((_a = t.categories) !== null && _a !== void 0 ? _a : []).flatMap((c) => { var _a; return ((_a = c.subCategories) !== null && _a !== void 0 ? _a : []).flatMap((sub) => { var _a; return (_a = sub.brands) !== null && _a !== void 0 ? _a : []; }); });
                })
                    .map((b) => {
                    var _a;
                    return ({
                        title: b.title,
                        slug: b.slug,
                        img: (_a = b.image) !== null && _a !== void 0 ? _a : "",
                    });
                });
            }
            return s;
        })));
        res.json({ layout: Object.assign(Object.assign({}, layout), { sections }) });
    }
    catch (err) {
        next(err);
    }
});
exports.getBySlug = getBySlug;
const getById = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const layout = yield model_1.PageLayout.findById(req.params.id).lean();
        if (!layout)
            return res.status(404).json({ message: "Not found" });
        res.json({ layout });
    }
    catch (err) {
        next(err);
    }
});
exports.getById = getById;
function sanitizeSections(sections = []) {
    return sections.map((s) => {
        const tc = s.titleConfig;
        if (tc && typeof tc.text === "string") {
            tc.text = { en: tc.text, bn: "" };
        }
        return s;
    });
}
const create = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const body = Object.assign(Object.assign({}, req.body), { sections: sanitizeSections(req.body.sections) });
        const layout = yield model_1.PageLayout.create(body);
        res.status(201).json({ layout });
    }
    catch (err) {
        next(err);
    }
});
exports.create = create;
const update = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const body = Object.assign(Object.assign({}, req.body), { sections: sanitizeSections(req.body.sections) });
        const layout = yield model_1.PageLayout.findByIdAndUpdate(req.params.id, body, {
            new: true,
        });
        if (!layout)
            return res.status(404).json({ message: "Not found" });
        res.json({ layout });
    }
    catch (err) {
        next(err);
    }
});
exports.update = update;
const remove = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield model_1.PageLayout.findByIdAndDelete(req.params.id);
        res.json({ message: "Deleted" });
    }
    catch (err) {
        next(err);
    }
});
exports.remove = remove;
const getSectionProducts = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { filterType, id } = req.query;
        const queryMap = {
            category: { "category.id": id },
            subCategory: { "subcategory.id": id },
            brand: { "brand.id": id },
        };
        const query = queryMap[filterType];
        if (!query)
            return res.status(400).json({ message: "Invalid filterType" });
        const products = yield model_2.Product.find(query)
            .select("title slug img regularPrice salePrice")
            .limit(10)
            .lean();
        res.json({ products });
    }
    catch (err) {
        next(err);
    }
});
exports.getSectionProducts = getSectionProducts;
