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
exports.deleteComboOffer = exports.updateComboOffer = exports.getSellerComboOffers = exports.getComboOfferById = exports.getComboOffers = exports.createComboOffer = void 0;
const model_1 = require("./model");
const model_2 = __importDefault(require("../product/model"));
const createComboOffer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, bookIds, sellingPrice, seller } = req.body;
        const products = yield model_2.default.find({ _id: { $in: bookIds } });
        if (products.length !== bookIds.length) {
            return res
                .status(400)
                .json({ success: false, message: "Some products not found" });
        }
        const books = products.map((product) => ({
            product: product._id,
            title: product.title,
            img: product.img,
            sellingPrice: product.sellingPrice,
        }));
        const regularPrice = books.reduce((sum, book) => sum + book.sellingPrice, 0);
        if (sellingPrice >= regularPrice) {
            return res.status(400).json({
                success: false,
                message: "Combo price must be lower than total price",
            });
        }
        const discountAmount = regularPrice - sellingPrice;
        const discountPercentage = Math.round((discountAmount / regularPrice) * 100);
        const comboOffer = new model_1.ComboOffer({
            title,
            books,
            regularPrice,
            sellingPrice,
            discountAmount,
            discountPercentage,
            seller,
        });
        yield comboOffer.save();
        res.status(201).json({ success: true, data: comboOffer });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Server error", error });
    }
});
exports.createComboOffer = createComboOffer;
const getComboOffers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const comboOffers = yield model_1.ComboOffer.find({ isActive: true })
            .populate("seller", "name sellerInfo.companyName")
            .sort({ createdAt: -1 });
        res.json({ success: true, data: comboOffers });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Server error", error });
    }
});
exports.getComboOffers = getComboOffers;
const getComboOfferById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const comboOffer = yield model_1.ComboOffer.findById(id)
            .populate("seller", "name sellerInfo.companyName")
            .populate("books.product");
        if (!comboOffer) {
            return res
                .status(404)
                .json({ success: false, message: "Combo offer not found" });
        }
        res.json({ success: true, data: comboOffer });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Server error", error });
    }
});
exports.getComboOfferById = getComboOfferById;
const getSellerComboOffers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { sellerId } = req.params;
        const comboOffers = yield model_1.ComboOffer.find({ seller: sellerId }).sort({
            createdAt: -1,
        });
        res.json({ success: true, data: comboOffers });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Server error", error });
    }
});
exports.getSellerComboOffers = getSellerComboOffers;
const updateComboOffer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const updates = req.body;
        const comboOffer = yield model_1.ComboOffer.findByIdAndUpdate(id, updates, {
            new: true,
        });
        if (!comboOffer) {
            return res
                .status(404)
                .json({ success: false, message: "Combo offer not found" });
        }
        res.json({ success: true, data: comboOffer });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Server error", error });
    }
});
exports.updateComboOffer = updateComboOffer;
const deleteComboOffer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield model_1.ComboOffer.findByIdAndUpdate(id, { isActive: false });
        res.json({ success: true, message: "Combo offer deleted" });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Server error", error });
    }
});
exports.deleteComboOffer = deleteComboOffer;
