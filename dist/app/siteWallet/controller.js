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
exports.forUserDetailsPage = exports.allSlugsForUserIndexPage = exports.allForUserIndexPage = exports.singleForEditPage = exports.allForAdminIndexPage = exports.update = exports.create = void 0;
const model_1 = require("./model");
//===================== Admin Controllers =====================
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const item = yield model_1.SiteWallet.create(req.body);
        res.status(201).json({ message: "SiteWallet created successfully!", item });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to create SiteWallet.", error: error.message });
    }
});
exports.create = create;
const update = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const item = yield model_1.SiteWallet.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
        if (!item)
            return res.status(404).json({ message: "SiteWallet not found." });
        res.status(200).json({ message: "SiteWallet updated successfully!", item });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to update SiteWallet.", error: error.message });
    }
});
exports.update = update;
const allForAdminIndexPage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const items = yield model_1.SiteWallet.find().select("title").sort({ createdAt: -1 });
        res.status(200).json(items);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch SiteWallets.", error: error.message });
    }
});
exports.allForAdminIndexPage = allForAdminIndexPage;
const singleForEditPage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const item = yield model_1.SiteWallet.findOne({ _id: req.params.id });
        res.status(200).json(item);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch SiteWallet.", error: error.message });
    }
});
exports.singleForEditPage = singleForEditPage;
// ================== User Controllers ======================
const allForUserIndexPage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const items = yield model_1.SiteWallet.find().sort({ createdAt: -1 });
        res.status(200).json(items);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch SiteWallets.", error: error.message });
    }
});
exports.allForUserIndexPage = allForUserIndexPage;
const allSlugsForUserIndexPage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const items = yield model_1.SiteWallet.find({ display: true }, "slug -_id");
        res.status(200).json({ message: "SiteWallet slugs fetched successfully!", items });
    }
    catch (error) {
        console.error("Failed to fetch slugs:", error);
        res.status(500).json({ message: "Failed to fetch SiteWallet slugs." });
    }
});
exports.allSlugsForUserIndexPage = allSlugsForUserIndexPage;
const forUserDetailsPage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const item = yield model_1.SiteWallet.findOne({ slug: req.params.slug });
        if (!item) {
            return res.status(404).json({ message: "Oops! SiteWallet not found.", item: null });
        }
        res.status(200).json(item);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch SiteWallet.", error: error.message });
    }
});
exports.forUserDetailsPage = forUserDetailsPage;
