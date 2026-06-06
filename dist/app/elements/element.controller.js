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
exports.allForIndexPageByTargetedPageAndId = exports.update = exports.updatePageElementStatus = exports.deletePageElementById = exports.elementById = exports.singleForEditPage = exports.getElementById = exports.create = void 0;
const element_model_1 = require("./element.model"); // Your Mongoose model
const model_1 = __importDefault(require("../product/model"));
const banner_model_1 = __importDefault(require("../banner/banner.model"));
const writer_model_1 = __importDefault(require("../writer/writer.model"));
const user_model_1 = __importDefault(require("../user/user.model"));
// Helper function to upload images to Cloudinary using promises
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = req.body;
        const item = yield element_model_1.PageElements.create(data);
        // Send success message along with the created product data
        res.status(201).json({
            message: "Created successfully!",
            item, // Optionally, include the created product in the response
        });
    }
    catch (error) {
        console.log(error);
        // Send error message if there was an issue
        res.status(500).json({
            message: "Failed to create.",
            error: error.message,
        });
    }
});
exports.create = create;
// Get PageElement by ID
const getElementById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const pageElement = yield element_model_1.PageElements.findById(id).populate("bannerId");
        if (!pageElement) {
            return res.status(404).json({ message: "PageElement not found" });
        }
        res.status(200).json({
            message: "PageElement fetched successfully",
            data: pageElement,
        });
    }
    catch (error) {
        res
            .status(500)
            .json({ message: "Error fetching PageElement", error: error.message });
    }
});
exports.getElementById = getElementById;
// Get PageElement by ID
const singleForEditPage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const item = yield element_model_1.PageElements.findById(id);
        if (!item) {
            return res.status(404).json({ message: "Item not found" });
        }
        res.status(200).json(item);
    }
    catch (error) {
        res
            .status(500)
            .json({ message: "Error fetching PageElement", error: error.message });
    }
});
exports.singleForEditPage = singleForEditPage;
const elementById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        // Fetch the page element by ID
        const pageElement = yield element_model_1.PageElements.findById(id);
        if (!pageElement) {
            return res
                .status(404)
                .json({ message: "No Page elements found for the targeted page ID" });
        }
        // Process sections to populate banners or products
        const updatedSections = yield Promise.all(pageElement.sections.map((sec) => __awaiter(void 0, void 0, void 0, function* () {
            //@ts-ignore
            const sectionCopy = Object.assign({}, sec.toObject()); // create a plain object
            if (sec.selectionType === "banner" && sec.banner) {
                const banner = yield banner_model_1.default.findById(sec.banner);
                sectionCopy.banner = banner || null;
            }
            if (sec.selectionType === "category" && sec.category) {
                const products = yield model_1.default.find({
                    category: sec.category,
                    display: true,
                    isEnabledByAdmin: true,
                }).limit(sec.postLimit || 10);
                sectionCopy.category = products;
            }
            if (sec.selectionType === "subcategory" && sec.subcategory) {
                const products = yield model_1.default.find({
                    subcategory: sec.subcategory,
                    display: true,
                    isEnabledByAdmin: true,
                })
                    .select("slug img title existingQnt seller sellingPrice regularPrice category stockStatus")
                    .limit(sec.postLimit || 10);
                sectionCopy.subcategory = products;
            }
            if (sec.selectionType === "writer" && sec.writer) {
                const products = yield model_1.default.find({
                    writer: sec.writer,
                    display: true,
                    isEnabledByAdmin: true,
                })
                    .select("slug img title existingQnt seller sellingPrice regularPrice category stockStatus")
                    .limit(sec.postLimit || 10);
                sectionCopy.writer = products;
            }
            if (sec.selectionType === "latest") {
                const products = yield model_1.default.find({
                    display: true,
                    isEnabledByAdmin: true,
                })
                    .sort({ createdAt: -1 })
                    .select("slug img title existingQnt seller sellingPrice regularPrice category stockStatus")
                    .limit(sec.postLimit || 10);
                sectionCopy.latest = products;
            }
            if (sec.selectionType === "preOrder") {
                const products = yield model_1.default.find({
                    orderType: "Pre_Order",
                    display: true,
                    isEnabledByAdmin: true,
                })
                    .select("slug img title existingQnt seller sellingPrice regularPrice category stockStatus")
                    .limit(sec.postLimit || 10);
                sectionCopy.preOrder = products;
            }
            if (sec.selectionType === "bestSellingBooks") {
                const products = yield model_1.default.find({
                    display: true,
                    isEnabledByAdmin: true,
                })
                    .select("slug img title existingQnt seller sellingPrice regularPrice category stockStatus")
                    .limit(sec.postLimit || 10);
                sectionCopy.bestSellingBooks = products;
            }
            if (sec.selectionType === "bestSellingWriters") {
                const writers = yield writer_model_1.default.find().limit(sec.postLimit || 10);
                sectionCopy.bestSellingWriters = writers;
            }
            if (sec.selectionType === "bestSellingPublications") {
                const publications = yield user_model_1.default.find({ role: "seller" })
                    .select("image name slug companyName")
                    .limit(sec.postLimit || 10);
                sectionCopy.bestSellingPublications = publications;
            }
            return sectionCopy;
        })));
        // Return updated page element with populated sections
        res.status(200).json({
            _id: pageElement._id,
            title: pageElement.title,
            sections: updatedSections,
        });
    }
    catch (error) {
        console.error(error);
        res
            .status(500)
            .json({ message: "Error fetching PageElements", error: error.message });
    }
});
exports.elementById = elementById;
// Delete a single PageElement by ID
const deletePageElementById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const pageElement = yield element_model_1.PageElements.findByIdAndDelete(id);
        if (!pageElement) {
            return res.status(404).json({ message: "PageElement not found" });
        }
        res.status(200).json({
            message: "PageElement deleted successfully",
        });
    }
    catch (error) {
        res
            .status(500)
            .json({ message: "Error deleting PageElement", error: error.message });
    }
});
exports.deletePageElementById = deletePageElementById;
// Update the status of a PageElement by ID
const updatePageElementStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params; // Make sure the ID is being passed correctly
    const { status } = req.body;
    try {
        const updatedPageElement = yield element_model_1.PageElements.findByIdAndUpdate(id, { status }, // Ensure 'status' is the correct field
        { new: true } // Return the updated document
        );
        if (!updatedPageElement) {
            return res.status(404).json({ message: "PageElement not found" });
        }
        res.status(200).json({
            message: "PageElement status updated successfully",
            data: updatedPageElement,
        });
    }
    catch (error) {
        res.status(500).json({
            message: "Error updating PageElement status",
            error: error.message,
        });
    }
});
exports.updatePageElementStatus = updatePageElementStatus;
const update = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const item = yield element_model_1.PageElements.findByIdAndUpdate(id, req.body, {
            new: true, // Return the updated document
            runValidators: true, // Run validation on the updated data
        });
        if (!item) {
            return res.status(404).json({
                message: "Not found.",
            });
        }
        res.status(200).json({
            message: "Updated successfully!",
            item,
        });
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to update.",
            error: error,
        });
    }
});
exports.update = update;
const allForIndexPageByTargetedPageAndId = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { targetedPageId, page } = req.params;
        const items = yield element_model_1.PageElements.find();
        res.status(200).json(items);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.allForIndexPageByTargetedPageAndId = allForIndexPageByTargetedPageAndId;
