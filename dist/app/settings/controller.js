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
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCompanyPaymentMethod = exports.toggleCompanyPaymentMethod = exports.updateCompanyPaymentMethod = exports.addCompanyPaymentMethod = exports.getCompanyPaymentMethods = exports.updateSettings = exports.getSettings = exports.getPublicSettings = void 0;
const model_1 = require("./model");
const getOrCreate = () => __awaiter(void 0, void 0, void 0, function* () {
    // L-09 fix: atomic upsert — prevents two concurrent requests creating two Settings docs
    return yield model_1.Settings.findOneAndUpdate({}, { $setOnInsert: {} }, { upsert: true, new: true, setDefaultsOnInsert: true });
});
// H-02 fix: public endpoint returns only UI-safe fields (no financial/sensitive data)
const getPublicSettings = (_req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const doc = yield getOrCreate();
        res.json({
            settings: {
                siteTitle: doc.siteTitle,
                siteTagline: doc.siteTagline,
                logo: doc.logo,
                favicon: doc.favicon,
                metaDescription: doc.metaDescription,
                metaKeywords: doc.metaKeywords,
                contactPhone: doc.contactPhone,
                contactEmail: doc.contactEmail,
                contactAddress: doc.contactAddress,
                socialFacebook: doc.socialFacebook,
                socialYoutube: doc.socialYoutube,
                branches: doc.branches,
                investmentConfig: doc.investmentConfig,
                balanceTransferFeePercent: doc.balanceTransferFeePercent,
                // Return only active payment methods for checkout display
                companyPaymentMethods: ((_a = doc.companyPaymentMethods) !== null && _a !== void 0 ? _a : []).filter(m => m.isActive),
            },
        });
    }
    catch (err) {
        next(err);
    }
});
exports.getPublicSettings = getPublicSettings;
// Full settings — admin only
const getSettings = (_req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.json({ settings: yield getOrCreate() });
    }
    catch (err) {
        next(err);
    }
});
exports.getSettings = getSettings;
// H-09 fix: updateSettings now rejects attempts to overwrite ranks via this endpoint
const updateSettings = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const doc = yield getOrCreate();
        // Prevent overwriting ranks through this endpoint — use /rank routes instead
        const _a = req.body, { ranks, companyPaymentMethods } = _a, safeBody = __rest(_a, ["ranks", "companyPaymentMethods"]);
        Object.assign(doc, safeBody);
        yield doc.save();
        res.json({ message: "Settings updated", settings: doc });
    }
    catch (err) {
        next(err);
    }
});
exports.updateSettings = updateSettings;
// ── Company Payment Methods CRUD ──────────────────────────────────────────────
// GET /settings/payment-methods — all payment methods (admin)
const getCompanyPaymentMethods = (_req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const doc = yield getOrCreate();
        res.json({ paymentMethods: (_a = doc.companyPaymentMethods) !== null && _a !== void 0 ? _a : [] });
    }
    catch (err) {
        next(err);
    }
});
exports.getCompanyPaymentMethods = getCompanyPaymentMethods;
// POST /settings/payment-methods — add a new payment method
const addCompanyPaymentMethod = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { type, label, accountNumber, accountName, branchName, isActive } = req.body;
        if (!type || !["bank", "bkash", "nagad", "rocket"].includes(type)) {
            return res.status(400).json({ message: "Invalid type. Must be bank, bkash, nagad, or rocket" });
        }
        if (!label || !String(label).trim()) {
            return res.status(400).json({ message: "Label is required" });
        }
        if (!accountNumber || !String(accountNumber).trim()) {
            return res.status(400).json({ message: "Account number is required" });
        }
        const doc = yield getOrCreate();
        doc.companyPaymentMethods.push({
            type,
            label: String(label).trim(),
            accountNumber: String(accountNumber).trim(),
            accountName: accountName ? String(accountName).trim() : "",
            branchName: branchName ? String(branchName).trim() : "",
            isActive: isActive !== false,
        });
        yield doc.save();
        res.status(201).json({ message: "Payment method added", paymentMethods: doc.companyPaymentMethods });
    }
    catch (err) {
        next(err);
    }
});
exports.addCompanyPaymentMethod = addCompanyPaymentMethod;
// PUT /settings/payment-methods/:id — update a payment method
const updateCompanyPaymentMethod = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { type, label, accountNumber, accountName, branchName, isActive } = req.body;
        const doc = yield getOrCreate();
        const entry = doc.companyPaymentMethods.find((m) => m._id.toString() === id);
        if (!entry)
            return res.status(404).json({ message: "Payment method not found" });
        if (type !== undefined) {
            if (!["bank", "bkash", "nagad", "rocket"].includes(type)) {
                return res.status(400).json({ message: "Invalid type" });
            }
            entry.type = type;
        }
        if (label !== undefined)
            entry.label = String(label).trim();
        if (accountNumber !== undefined)
            entry.accountNumber = String(accountNumber).trim();
        if (accountName !== undefined)
            entry.accountName = String(accountName).trim();
        if (branchName !== undefined)
            entry.branchName = String(branchName).trim();
        if (isActive !== undefined)
            entry.isActive = Boolean(isActive);
        yield doc.save();
        res.json({ message: "Payment method updated", paymentMethods: doc.companyPaymentMethods });
    }
    catch (err) {
        next(err);
    }
});
exports.updateCompanyPaymentMethod = updateCompanyPaymentMethod;
// PATCH /settings/payment-methods/:id/toggle — toggle active status
const toggleCompanyPaymentMethod = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const doc = yield getOrCreate();
        const entry = doc.companyPaymentMethods.find((m) => m._id.toString() === id);
        if (!entry)
            return res.status(404).json({ message: "Payment method not found" });
        entry.isActive = !entry.isActive;
        yield doc.save();
        res.json({ message: `Payment method ${entry.isActive ? "activated" : "deactivated"}`, paymentMethods: doc.companyPaymentMethods });
    }
    catch (err) {
        next(err);
    }
});
exports.toggleCompanyPaymentMethod = toggleCompanyPaymentMethod;
// DELETE /settings/payment-methods/:id — delete a payment method
const deleteCompanyPaymentMethod = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const doc = yield getOrCreate();
        const before = doc.companyPaymentMethods.length;
        doc.companyPaymentMethods = doc.companyPaymentMethods.filter((m) => m._id.toString() !== id);
        if (doc.companyPaymentMethods.length === before) {
            return res.status(404).json({ message: "Payment method not found" });
        }
        yield doc.save();
        res.json({ message: "Payment method deleted", paymentMethods: doc.companyPaymentMethods });
    }
    catch (err) {
        next(err);
    }
});
exports.deleteCompanyPaymentMethod = deleteCompanyPaymentMethod;
