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
exports.updatePdfPreview = void 0;
const model_1 = __importDefault(require("../product/model"));
const updatePdfPreview = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId } = req.params;
        const { pdfPreview } = req.body;
        if (!(pdfPreview === null || pdfPreview === void 0 ? void 0 : pdfPreview.url)) {
            return res.status(400).json({ success: false, message: 'PDF URL is required' });
        }
        const product = yield model_1.default.findByIdAndUpdate(productId, { pdfPreview }, { new: true });
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        res.json({
            success: true,
            message: 'PDF preview updated successfully',
            pdfPreview: product.pdfPreview
        });
    }
    catch (error) {
        console.error('PDF update error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.updatePdfPreview = updatePdfPreview;
