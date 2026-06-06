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
exports.search = void 0;
const model_1 = __importDefault(require("./model"));
const search = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title } = req.query;
        const query = Object.assign({ display: true, isEnabledByAdmin: true }, (title && {
            $or: [
                { "title.en": { $regex: title, $options: "i" } },
                { "title.bn": { $regex: title, $options: "i" } },
            ],
        }));
        const slugs = yield model_1.default.find(query)
            .limit(10)
            .select("title slug img sellingPrice category stockStatus regularPrice")
            .populate("category", "title")
            .lean();
        res.json(slugs || []);
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});
exports.search = search;
