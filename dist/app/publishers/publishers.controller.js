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
exports.allPublisherForFiltering = exports.getAllPublisherIds = exports.deletePublisher = exports.allForIndexPage = exports.getPublisherBySlug = exports.allForProductUploadPage = exports.getAllPublishers = exports.getPublisherById = exports.createPublisher = void 0;
const model_1 = __importDefault(require("../product/model"));
const uploadSingleFileToCloudinary_1 = require("../shared/uploadSingleFileToCloudinary");
const publishers_model_1 = __importDefault(require("./publishers.model"));
const createPublisher = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const files = req.files;
        const obj = req.body;
        let imgFile;
        let metaImgFile;
        if (files instanceof Array) {
            imgFile = files === null || files === void 0 ? void 0 : files.find((f) => f.fieldname === "img");
            metaImgFile = files === null || files === void 0 ? void 0 : files.find((f) => f.fieldname === "metaImg");
        }
        const imgUrl = yield (0, uploadSingleFileToCloudinary_1.cloudinaryUpload)(imgFile);
        const metaImgUrl = yield (0, uploadSingleFileToCloudinary_1.cloudinaryUpload)(metaImgFile);
        const keywords = req.body.keywords
            .split(",")
            .map((tag) => tag.trim());
        const updatePublisher = Object.assign(Object.assign({}, obj), { img: imgUrl ? imgUrl : obj.img, metaImg: metaImgUrl ? metaImgUrl : obj.metaImg, keywords: keywords });
        if (obj._id) {
            const respondedPublisher = yield publishers_model_1.default.findOneAndUpdate({ _id: obj._id }, // Condition to find the document (e.g., unique `pageName`)
            updatePublisher, {
                new: true, // Return the updated document
                upsert: true, // Create the document if it doesn't exist
            });
            res.status(200).send({
                respondedPublisher,
                message: "Updated successfully",
            });
        }
        else {
            const { _id } = updatePublisher, elsePublisher = __rest(updatePublisher, ["_id"]);
            const respondedPublisher = yield publishers_model_1.default.create(elsePublisher);
            res.status(200).send({
                respondedPublisher,
                message: "Created successfully",
            });
        }
    }
    catch (err) {
        res.status(500).send({ error: "Internal Server Error" });
    }
});
exports.createPublisher = createPublisher;
const getPublisherById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const publisher = yield publishers_model_1.default.findById(req.params.id);
        if (!publisher) {
            res.status(404).send({ error: "Not found" });
            return;
        }
        res.status(200).send({ publisher });
    }
    catch (err) {
        res.status(500).send({ error: "Internal Server Error" });
    }
});
exports.getPublisherById = getPublisherById;
const getAllPublishers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Fetch all publishers
        const previousPublishers = yield publishers_model_1.default.find();
        // Fetch products and count products per publisher
        const publishers = yield Promise.all(previousPublishers.map((publisher) => __awaiter(void 0, void 0, void 0, function* () {
            const productCount = yield model_1.default.countDocuments({
                publisher: publisher._id,
            });
            return Object.assign(Object.assign({}, publisher.toJSON()), { publisherProducts: productCount });
        })));
        const sortedPublishers = publishers.sort((a, b) => a.position - b.position);
        res.status(200).json({ publishers: sortedPublishers });
    }
    catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.getAllPublishers = getAllPublishers;
const allForProductUploadPage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Fetch all publishers
        const previousPublishers = yield publishers_model_1.default.find().select("title slug");
        // Fetch products and count products per publisher
        const sortedPublishers = previousPublishers.sort((a, b) => a.position - b.position);
        res.status(200).json({ publishers: sortedPublishers });
    }
    catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.allForProductUploadPage = allForProductUploadPage;
// export const getAllPublishersForNavbar = async (
//   req: Request,
//   res: Response
// ): Promise<void> => {
//   try {
//     const previousPublishers = await Publisher.find()
//       .select("_id title slug  position  attachedSubCategories")
//       .lean();
//     // Product counting part end
//     const categories = await Category.find()
//       .select("subCategories title")
//       .lean();
//     // Flatten all subcategories into a single lookup map
//     const subcategoryLookup: { [key: string]: Subcategory } = categories.reduce(
//       (map, category) => {
//         category.subCategories?.forEach((subCategory) => {
//           map[subCategory._id.toString()] = subCategory;
//         });
//         return map;
//       },
//       {} as { [key: string]: Subcategory }
//     );
//     const enrichedPublishers = previousPublishers.map((publisher) => {
//       const enrichedSubcategories = publisher.attachedSubCategories
//         ?.map(
//           (subCategoryId) => subcategoryLookup[subCategoryId.toString()] || null
//         )
//         .filter(Boolean); // Remove null values for invalid IDs
//       return {
//         ...publisher, // Convert Mongoose document to plain JavaScript object
//         attachedSubCategories: enrichedSubcategories, // Replace IDs with details
//       };
//     });
//     const transformedobj = enrichedPublishers.map((parentCategory) => ({
//       _id: parentCategory._id,
//       title: parentCategory.title,
//       slug: parentCategory.slug,
//       position: parentCategory.position,
//       attachedSubCategories: parentCategory.attachedSubCategories?.map(
//         (subCategory: any) => ({
//           _id: subCategory._id,
//           title: subCategory.title,
//           slug: subCategory.slug,
//           position: subCategory.position,
//         })
//       ),
//     }));
//     const sortedPublishers = transformedobj.sort(
//       (a, b) => a.position - b.position
//     );
//     res.status(200).json({ enrichedPublishers: sortedPublishers });
//   } catch (error: any) {
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };
// export const getAllPublishersForPublisherPage = async (
//   req: Request,
//   res: Response
// ): Promise<void> => {
//   try {
//     const previousPublishers = await Publisher.find().select(
//       "_id title slug photo position rating attachedSubCategories"
//     );
//     // Product counting part start
//     const publishers = await Promise.all(
//       previousPublishers.map(async (publisher) => {
//         const productCount = await Product.countDocuments({ publisher: publisher._id });
//         return {
//           ...publisher.toJSON(),
//           publisherProducts: productCount,
//         };
//       })
//     );
//     // Product counting part end
//     const categories = await Category.find()
//       .select("subCategories title")
//       .lean();
//     // Flatten all subcategories into a single lookup map
//     const subcategoryLookup: { [key: string]: Subcategory } = categories.reduce(
//       (map, category) => {
//         category.subCategories?.forEach((subCategory) => {
//           map[subCategory._id.toString()] = subCategory;
//         });
//         return map;
//       },
//       {} as { [key: string]: Subcategory }
//     );
//     const enrichedPublishers = publishers.map((publisher) => {
//       const enrichedSubcategories = publisher.attachedSubCategories
//         .map(
//           (subCategoryId) => subcategoryLookup[subCategoryId.toString()] || null
//         )
//         .filter(Boolean); // Remove null values for invalid IDs
//       return {
//         ...publisher, // Convert Mongoose document to plain JavaScript object
//         attachedSubCategories: enrichedSubcategories, // Replace IDs with details
//       };
//     });
//     const transformedobj = enrichedPublishers.map((parentCategory) => ({
//       _id: parentCategory._id,
//       title: parentCategory.title,
//       slug: parentCategory.slug,
//       photo: parentCategory.photo,
//       position: parentCategory.position,
//       publisherProducts: parentCategory.publisherProducts,
//       rating: parentCategory.rating,
//       attachedSubCategories: parentCategory.attachedSubCategories.map(
//         (subCategory: any) => ({
//           _id: subCategory._id,
//           title: subCategory.title,
//           slug: subCategory.slug,
//           photo: subCategory.photo,
//           position: subCategory.position,
//         })
//       ),
//     }));
//     const sortedPublishers = transformedobj.sort(
//       (a, b) => a.position - b.position
//     );
//     res.status(200).json({ enrichedPublishers: sortedPublishers });
//   } catch (error: any) {
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };
const getPublisherBySlug = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const publisher = yield publishers_model_1.default.findOne({ slug: req.params.slug });
        if (!publisher) {
            res.status(404).send({ error: "Publisher not found" });
            return;
        }
        res.status(200).send({ publisher });
    }
    catch (err) {
        res.status(500).send({ error: "Internal Server Error" });
    }
});
exports.getPublisherBySlug = getPublisherBySlug;
const allForIndexPage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const publishers = yield publishers_model_1.default.find()
            .select("_id title slug img link")
            .lean();
        res.status(200).send(publishers);
    }
    catch (err) {
        res.status(500).send({ error: "Internal Server Error" });
    }
});
exports.allForIndexPage = allForIndexPage;
const deletePublisher = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const publisher = yield publishers_model_1.default.findByIdAndDelete(req.params.id);
        if (!publisher) {
            res.status(404).send({ error: "Publisher not found" });
            return;
        }
        res.status(200).send({ message: "Publisher deleted successfully" });
    }
    catch (err) {
        res.status(500).send({ error: "Internal Server Error" });
    }
});
exports.deletePublisher = deletePublisher;
// Function to get all publisher IDs
const getAllPublisherIds = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const publisherIds = yield publishers_model_1.default.find().select("slug").lean();
        // Extract the _id field from each publisher and return an array of IDs
        const ids = publisherIds.map((publisher) => publisher.slug);
        res.status(200).json(ids);
    }
    catch (err) {
        res.status(500).send({ error: "Internal Server Error" });
    }
});
exports.getAllPublisherIds = getAllPublisherIds;
// Get all
const allPublisherForFiltering = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const items = yield publishers_model_1.default.find().select("title");
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
exports.allPublisherForFiltering = allPublisherForFiltering;
