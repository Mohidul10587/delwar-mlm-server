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
exports.updateSettings = exports.getSettings = exports.getPublicSettings = void 0;
const model_1 = require("./model");
const getOrCreate = () => __awaiter(void 0, void 0, void 0, function* () {
    // L-09 fix: atomic upsert — prevents two concurrent requests creating two Settings docs
    return yield model_1.Settings.findOneAndUpdate({}, { $setOnInsert: {} }, { upsert: true, new: true, setDefaultsOnInsert: true });
});
// H-02 fix: public endpoint returns only UI-safe fields (no financial/sensitive data)
const getPublicSettings = (_req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
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
        const _a = req.body, { ranks } = _a, safeBody = __rest(_a, ["ranks"]);
        Object.assign(doc, safeBody);
        yield doc.save();
        res.json({ message: "Settings updated", settings: doc });
    }
    catch (err) {
        next(err);
    }
});
exports.updateSettings = updateSettings;
