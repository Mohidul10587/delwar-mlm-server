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
exports.slugsForSitemap = exports.deleteById = void 0;
const deleteById = (Model) => {
    return (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            const deletedItem = yield Model.findByIdAndDelete(id);
            if (!deletedItem) {
                return res.status(404).json({
                    success: false,
                    resData: null,
                    message: "Oops! Item not found.",
                });
            }
            res.status(200).json({
                success: true,
                message: "Deleted successfully!",
            });
        }
        catch (error) {
            res.status(500).json({
                message: "Failed to delete.",
            });
        }
    });
};
exports.deleteById = deleteById;
const slugsForSitemap = (Model) => {
    return (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const arrayOfObjectWithSlug = yield Model.find()
                .select("slug -_id")
                .lean();
            // Extract the _id field from each product and return an array of IDs
            const slugs = arrayOfObjectWithSlug.map((item) => item.slug);
            res.status(200).json({
                success: true,
                message: "Fetched successfully!",
                resData: slugs,
            });
        }
        catch (error) {
            res
                .status(500)
                .json({ success: false, error: "Failed to retrieve product IDs" });
        }
    });
};
exports.slugsForSitemap = slugsForSitemap;
