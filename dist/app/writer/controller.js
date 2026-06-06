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
exports.getWriterPageData = exports.getAllForPageBuilder = exports.update = exports.getWriteById = exports.getWriterBySlug = exports.allForUser = exports.allForAdmin = exports.singleForEditPage = exports.create = void 0;
const model_1 = __importDefault(require("./model"));
const model_2 = __importDefault(require("../product/model"));
const model_3 = __importDefault(require("../category/model"));
const model_4 = __importDefault(require("../user/model"));
const generateSLug_1 = require("../shared/generateSLug");
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const newCategory = yield model_1.default.create(Object.assign(Object.assign({}, req.body), { slug: (0, generateSLug_1.generateSlug)(req.body.title.en), createdBy: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id }));
        // Send success message along with the created category data
        res.status(201).json({
            message: "Created successfully!",
            respondedData: newCategory, // Optionally, include the created category in the response
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
// Get single
const singleForEditPage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const item = yield model_1.default.findOne({ _id: req.params.id });
        res.status(200).json(item);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to fetch.",
            error: error.message,
        });
    }
});
exports.singleForEditPage = singleForEditPage;
const allForAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Fetch all brands
        const writers = yield model_1.default.find()
            .select("title img writerId rating slug")
            .sort({ createdAt: -1 });
        res.status(200).json(writers || []);
    }
    catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.allForAdmin = allForAdmin;
const allForUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Fetch all brands
        const writers = yield model_1.default.find()
            .select("title img writerId rating slug")
            .sort({ createdAt: -1 });
        res.status(200).json({ writers });
    }
    catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.allForUser = allForUser;
const getWriterBySlug = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const writer = yield model_1.default.findOne({ slug: req.params.slug });
        if (!writer) {
            res.status(404).send({ error: "writer not found" });
            return;
        }
        res.status(200).send({ writer });
    }
    catch (err) {
        res.status(500).send({ error: "Internal Server Error" });
    }
});
exports.getWriterBySlug = getWriterBySlug;
const getWriteById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const writer = yield model_1.default.findById(req.params.id);
        if (!writer) {
            res.status(404).send({ error: "writer not found" });
            return;
        }
        res.status(200).send({ writer });
    }
    catch (err) {
        res.status(500).send({ error: "Internal Server Error" });
    }
});
exports.getWriteById = getWriteById;
// Update
const update = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { id } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        // Check if writer exists and user has permission to update
        const existingWriter = yield model_1.default.findById(id);
        if (!existingWriter) {
            return res.status(404).json({
                message: "Writer not found.",
            });
        }
        if (existingWriter.createdBy.toString() !== userId.toString() &&
            ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== "admin" &&
            ((_c = req.user) === null || _c === void 0 ? void 0 : _c.role) !== "staff") {
            return res.status(403).json({
                message: "You don't have permission to update this writer.",
            });
        }
        const updatedItem = yield model_1.default.findByIdAndUpdate(id, Object.assign(Object.assign({}, req.body), { slug: (0, generateSLug_1.generateSlug)(req.body.title.en) }), {
            new: true, // Return the updated document
            runValidators: true, // Run validation on the updated data
        });
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
const getAllForPageBuilder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const items = yield model_1.default.find().select("title").sort({ createdAt: -1 });
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
// Get all writer page data in single API call
const getWriterPageData = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { slug } = req.params;
        // Execute all queries in parallel
        const [writer, products, totalProducts, categories, publishers] = yield Promise.all([
            model_1.default.findOne({ slug }),
            model_1.default.findOne({ slug }).then((writerData) => __awaiter(void 0, void 0, void 0, function* () {
                if (writerData) {
                    return model_2.default.find({ writer: writerData._id })
                        .limit(20)
                        .sort({ createdAt: -1 })
                        .select("_id img title featured regularPrice sellingPrice slug ");
                }
                return [];
            })),
            model_1.default.findOne({ slug }).then((writerData) => __awaiter(void 0, void 0, void 0, function* () {
                if (writerData) {
                    return model_2.default.countDocuments({ writer: writerData._id });
                }
                return 0;
            })),
            model_3.default.find().select("title slug"),
            model_4.default.find({
                role: "seller",
                isEnabledByAdmin: true,
            }).select("name sellerInfo slug"),
        ]);
        res.status(200).json({
            success: true,
            message: "Writer page data fetched successfully",
            data: {
                writer: writer || null,
                products: products || [],
                totalProducts: totalProducts || 0,
                categories: categories || [],
                publishers: publishers || [],
            },
        });
    }
    catch (error) {
        console.error("Error fetching writer page data:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch writer page data",
            error: error.message,
        });
    }
});
exports.getWriterPageData = getWriterPageData;
