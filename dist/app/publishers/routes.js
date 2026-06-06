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
// routes/user.routes.ts
const express_1 = __importDefault(require("express"));
const model_1 = __importDefault(require("../user/model"));
const router = express_1.default.Router();
//=================== For user ===================
router.get("/slugsForSitemap", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const arrayOfObjectWithSlug = yield model_1.default.find({
            role: "seller",
            isEnabledByAdmin: true,
        })
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
}));
exports.default = router;
