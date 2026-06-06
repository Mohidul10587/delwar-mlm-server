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
exports.rejectReview = exports.approveReview = exports.getAllReviews = exports.getUserReviews = exports.getProductReviews = exports.updateReview = exports.createReview = void 0;
const model_1 = require("./model");
//===================== User Controllers =====================
const createReview = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId, rating, comment } = req.body;
        const userId = req.user.id;
        const existingReview = yield model_1.Review.findOne({ userId, productId });
        if (existingReview) {
            return res
                .status(400)
                .json({ message: "You have already reviewed this product." });
        }
        const review = yield model_1.Review.create({ userId, productId, rating, comment });
        res.status(201).json({ message: "Review submitted successfully!", review });
    }
    catch (error) {
        res
            .status(500)
            .json({ message: "Failed to create review.", error: error.message });
    }
});
exports.createReview = createReview;
const updateReview = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { rating, comment } = req.body;
        const userId = req.user.id;
        const review = yield model_1.Review.findOneAndUpdate({ _id: id, userId }, { rating, comment }, { new: true });
        if (!review) {
            return res
                .status(404)
                .json({ message: "Review not found or unauthorized." });
        }
        res.status(200).json({ message: "Review updated successfully!", review });
    }
    catch (error) {
        res
            .status(500)
            .json({ message: "Failed to update review.", error: error.message });
    }
});
exports.updateReview = updateReview;
const getProductReviews = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const skip = (page - 1) * limit;
        const total = yield model_1.Review.countDocuments({ productId, isApproved: true });
        const reviews = yield model_1.Review.find({ productId, isApproved: true })
            .populate("userId", "name image")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        res.status(200).json({ reviews, total });
    }
    catch (error) {
        res
            .status(500)
            .json({ message: "Failed to fetch reviews.", error: error.message });
    }
});
exports.getProductReviews = getProductReviews;
const getUserReviews = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const reviews = yield model_1.Review.find({ userId })
            .populate("productId", "title")
            .sort({ createdAt: -1 });
        res.status(200).json(reviews);
    }
    catch (error) {
        res
            .status(500)
            .json({ message: "Failed to fetch your reviews.", error: error.message });
    }
});
exports.getUserReviews = getUserReviews;
//===================== Admin Controllers =====================
const getAllReviews = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const reviews = yield model_1.Review.find()
            .populate("userId", "name email")
            .populate("productId", "title")
            .sort({ createdAt: -1 });
        res.status(200).json(reviews);
    }
    catch (error) {
        res
            .status(500)
            .json({ message: "Failed to fetch reviews.", error: error.message });
    }
});
exports.getAllReviews = getAllReviews;
const approveReview = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const review = yield model_1.Review.findByIdAndUpdate(id, { isApproved: true }, { new: true });
        if (!review)
            return res.status(404).json({ message: "Review not found." });
        res.status(200).json({ message: "Review approved successfully!", review });
    }
    catch (error) {
        res
            .status(500)
            .json({ message: "Failed to approve review.", error: error.message });
    }
});
exports.approveReview = approveReview;
const rejectReview = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const review = yield model_1.Review.findByIdAndUpdate(id, { isApproved: false }, { new: true });
        if (!review)
            return res.status(404).json({ message: "Review not found." });
        res.status(200).json({ message: "Review rejected successfully!", review });
    }
    catch (error) {
        res
            .status(500)
            .json({ message: "Failed to reject review.", error: error.message });
    }
});
exports.rejectReview = rejectReview;
