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
exports.deletePost = exports.getPosts = exports.createPost = void 0;
const model_1 = require("./model");
const model_2 = require("../user/model");
const validation_1 = require("./validation");
const createPost = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { content, media } = validation_1.createPostSchema.parse(req.body);
        const userId = req.userId;
        const post = yield model_1.Post.create({ userId, content, media });
        res.status(201).json({ message: { en: "Post created", bn: "পোস্ট তৈরি হয়েছে" }, post });
    }
    catch (error) {
        next(error);
    }
});
exports.createPost = createPost;
const getPosts = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const [posts, total] = yield Promise.all([
            model_1.Post.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            model_1.Post.countDocuments(),
        ]);
        const userIds = [...new Set(posts.map((p) => p.userId))];
        const users = yield model_2.User.find({ userId: { $in: userIds } }).select("userId name username").lean();
        const userMap = new Map(users.map((u) => [u.userId, u]));
        const postsWithUser = posts.map((post) => (Object.assign(Object.assign({}, post), { user: userMap.get(post.userId) })));
        res.json({ posts: postsWithUser, total, page, pages: Math.ceil(total / limit) });
    }
    catch (error) {
        next(error);
    }
});
exports.getPosts = getPosts;
const deletePost = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const userId = req.userId;
        const userRole = req.userRole;
        const post = yield model_1.Post.findById(id);
        if (!post)
            return res.status(404).json({ message: { en: "Post not found", bn: "পোস্ট পাওয়া যায়নি" } });
        if (post.userId !== userId && userRole !== "admin") {
            return res.status(403).json({ message: { en: "Unauthorized", bn: "অননুমোদিত" } });
        }
        yield model_1.Post.findByIdAndDelete(id);
        res.json({ message: { en: "Post deleted", bn: "পোস্ট মুছে ফেলা হয়েছে" } });
    }
    catch (error) {
        next(error);
    }
});
exports.deletePost = deletePost;
