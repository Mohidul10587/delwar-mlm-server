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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSellerProducts = exports.getSellerCoupons = exports.deleteCoupon = exports.updateCoupon = exports.createCoupon = exports.singleForEdit = exports.checkSellerHasCoupon = exports.validateCoupon = void 0;
const model_1 = require("./model");
const model_2 = __importDefault(require("../product/model"));
const validateCoupon = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { code, productId } = req.body;
        if (!code || !productId) {
            return res.status(400).json({ message: "Missing required fields" });
        }
        const product = yield model_2.default.findById(productId);
        if (!product) {
            return res.status(400).json({ message: "Product not found" });
        }
        const coupon = yield model_1.Coupon.findOne({
            code: code.toUpperCase(),
            isActive: true,
            startDate: { $lte: new Date() },
            expiryDate: { $gte: new Date() },
        });
        if (!coupon) {
            return res.status(400).json({ message: "Invalid or expired coupon" });
        }
        if (coupon.applicationType === "selected_products") {
            const isApplicable = coupon.applicableProducts.some((id) => id.toString() === productId);
            if (!isApplicable) {
                return res
                    .status(400)
                    .json({ message: "Coupon not applicable to this product" });
            }
        }
        const discount = coupon.discountType === "percentage"
            ? (product.sellingPrice * coupon.discountValue) / 100
            : coupon.discountValue;
        res.json({
            success: true,
            discount,
            coupon: {
                _id: coupon._id,
            },
        });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.validateCoupon = validateCoupon;
const checkSellerHasCoupon = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { sellerId } = req.params;
        const { productId } = req.query;
        const query = {
            seller: sellerId,
            isActive: true,
            startDate: { $lte: new Date() },
            expiryDate: { $gte: new Date() },
        };
        // If productId is provided, find coupons that apply to this product
        if (productId) {
            query.$or = [
                { applicationType: "all_products" },
                {
                    applicationType: "selected_products",
                    applicableProducts: productId,
                },
            ];
        }
        const coupon = yield model_1.Coupon.findOne(query).select("code discountType discountValue applicationType applicableProducts");
        res.json({
            _id: coupon === null || coupon === void 0 ? void 0 : coupon._id,
            hasCoupon: !!coupon,
            code: (coupon === null || coupon === void 0 ? void 0 : coupon.code) || null,
            discountType: coupon === null || coupon === void 0 ? void 0 : coupon.discountType,
            discountValue: coupon === null || coupon === void 0 ? void 0 : coupon.discountValue,
            applicationType: coupon === null || coupon === void 0 ? void 0 : coupon.applicationType,
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.checkSellerHasCoupon = checkSellerHasCoupon;
const singleForEdit = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const coupon = yield model_1.Coupon.findById(id);
        if (!coupon) {
            return res.status(404).json({ message: "Coupon not found" });
        }
        res.json({ coupon });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.singleForEdit = singleForEdit;
const createCoupon = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const sellerId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const _b = req.body, { applicationType, applicableProducts } = _b, otherData = __rest(_b, ["applicationType", "applicableProducts"]);
        if (applicationType === "selected_products") {
            if (!applicableProducts || applicableProducts.length === 0) {
                return res
                    .status(400)
                    .json({ message: "At least one product must be selected" });
            }
            const products = yield model_2.default.find({
                _id: { $in: applicableProducts },
                seller: sellerId,
            });
            if (products.length !== applicableProducts.length) {
                return res
                    .status(400)
                    .json({ message: "Some products don't belong to you" });
            }
        }
        const couponData = Object.assign(Object.assign({}, otherData), { seller: sellerId, applicationType, applicableProducts: applicationType === "selected_products" ? applicableProducts : [] });
        const coupon = new model_1.Coupon(couponData);
        yield coupon.save();
        res.status(201).json({ coupon });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.createCoupon = createCoupon;
const updateCoupon = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const sellerId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const _b = req.body, { applicationType, applicableProducts } = _b, otherData = __rest(_b, ["applicationType", "applicableProducts"]);
        if (applicationType === "selected_products") {
            if (!applicableProducts || applicableProducts.length === 0) {
                return res
                    .status(400)
                    .json({ message: "At least one product must be selected" });
            }
            const products = yield model_2.default.find({
                _id: { $in: applicableProducts },
                seller: sellerId,
            });
            if (products.length !== applicableProducts.length) {
                return res
                    .status(400)
                    .json({ message: "Some products don't belong to you" });
            }
        }
        const updateData = Object.assign(Object.assign({}, otherData), { applicationType, applicableProducts: applicationType === "selected_products" ? applicableProducts : [] });
        const coupon = yield model_1.Coupon.findOneAndUpdate({ _id: id, seller: sellerId }, updateData, { new: true, runValidators: true });
        if (!coupon) {
            return res.status(404).json({ message: "Coupon not found" });
        }
        res.json({ coupon });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.updateCoupon = updateCoupon;
const deleteCoupon = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const sellerId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const coupon = yield model_1.Coupon.findOneAndDelete({ _id: id, seller: sellerId });
        if (!coupon) {
            return res.status(404).json({ message: "Coupon not found" });
        }
        res.json({ message: "Coupon deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deleteCoupon = deleteCoupon;
const getSellerCoupons = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const sellerId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { page = 1, limit = 10 } = req.query;
        const coupons = yield model_1.Coupon.find({ seller: sellerId })
            .populate("applicableProducts", "title.en title.bn")
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit))
            .sort({ createdAt: -1 });
        const total = yield model_1.Coupon.countDocuments({ seller: sellerId });
        res.json({ coupons, total, page: Number(page), limit: Number(limit) });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getSellerCoupons = getSellerCoupons;
const getSellerProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const sellerId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const products = yield model_2.default.find({
            seller: sellerId,
            display: true,
        })
            .select("_id title.en title.bn img sellingPrice")
            .sort({ createdAt: -1 });
        res.json({ products });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getSellerProducts = getSellerProducts;
