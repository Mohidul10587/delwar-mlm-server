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
exports.remove = exports.update = exports.getOne = exports.getAll = exports.create = void 0;
const gallery_model_1 = __importDefault(require("./gallery.model"));
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const obj = req.body;
        const result = yield gallery_model_1.default.create(obj);
        res.status(200).send({ result, message: "Created successfully" });
    }
    catch (error) {
        console.error(error);
        res
            .status(500)
            .json({ success: false, message: "Error creating/updating", error });
    }
});
exports.create = create;
const getAll = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield gallery_model_1.default.find();
        res.status(200).send({ result: result.reverse() });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Error fetching", error });
    }
});
exports.getAll = getAll;
const getOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield gallery_model_1.default.findById(req.params.id);
        res.status(200).send({ result });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Error fetching", error });
    }
});
exports.getOne = getOne;
const update = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield gallery_model_1.default.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
        });
        res.status(200).send({ result, message: "Updated successfully" });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Error updating", error });
    }
});
exports.update = update;
const remove = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield gallery_model_1.default.findByIdAndDelete(req.params.id);
        res.status(200).send({ result, message: "Deleted successfully" });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Error deleting", error });
    }
});
exports.remove = remove;
// // Search Controller
// export const searchGallery = async (req: Request, res: Response) => {
//   try {
//     const {
//       title,
//       useCase,
//       page = 1,
//       limit = 10,
//       sortBy = "createdAt",
//       order = "desc",
//     } = req.query;
//     // Create the filter object
//     const filters: { [key: string]: any } = {};
//     if (title) {
//       filters.title = { $regex: title, $options: "i" }; // Case-insensitive regex search
//     }
//     if (useCase) {
//       filters.useCase = useCase;
//     }
//     // Calculate pagination values
//     const pageNumber = parseInt(page as string, 10);
//     const pageSize = parseInt(limit as string, 10);
//     const skip = (pageNumber - 1) * pageSize;
//     // Fetch data with filters, pagination, and sorting
//     const data = await Gallery.find(filters)
//       .sort({ [sortBy as string]: order === "asc" ? 1 : -1 })
//       .skip(skip)
//       .limit(pageSize);
//     // Get total count for pagination metadata
//     const totalCount = await Gallery.countDocuments(filters);
//     res.status(200).json({
//       success: true,
//       data,
//       pagination: {
//         totalItems: totalCount,
//         currentPage: pageNumber,
//         totalPages: Math.ceil(totalCount / pageSize),
//         pageSize,
//       },
//     });
//   } catch (error: any) {
//     console.error("Error in searchGallery:", error);
//     res.status(500).json({
//       success: false,
//       message: "An error occurred while searching the gallery.",
//       error: error.message,
//     });
//   }
// };
