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
exports.updateSettings = exports.getSettings = void 0;
const model_1 = require("./model");
const getOrCreate = () => __awaiter(void 0, void 0, void 0, function* () {
    const doc = yield model_1.Settings.findOne();
    return doc !== null && doc !== void 0 ? doc : (yield model_1.Settings.create({}));
});
const getSettings = (_req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.json({ settings: yield getOrCreate() });
    }
    catch (err) {
        next(err);
    }
});
exports.getSettings = getSettings;
const updateSettings = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const doc = yield getOrCreate();
        Object.assign(doc, req.body);
        yield doc.save();
        res.json({ message: { en: "Settings updated", bn: "সেটিংস আপডেট হয়েছে" }, settings: doc });
    }
    catch (err) {
        next(err);
    }
});
exports.updateSettings = updateSettings;
