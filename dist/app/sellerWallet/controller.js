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
exports.getMyWallet = void 0;
const model_1 = require("./model");
// ================== Seller Controllers ======================
const getMyWallet = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const sellerId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const wallet = yield model_1.SellerWallet.findOne({ seller: sellerId });
        if (!wallet)
            return res.status(404).json({ message: "Wallet not found." });
        res.status(200).json(wallet);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch wallet.", error: error.message });
    }
});
exports.getMyWallet = getMyWallet;
