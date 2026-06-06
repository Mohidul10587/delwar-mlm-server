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
exports.remove = exports.update = exports.create = exports.getAll = void 0;
const model_1 = require("./model");
const getAll = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const productTypes = yield model_1.ProductType.find().sort({ createdAt: -1 }).lean();
        const normalized = productTypes.map((t) => {
            var _a;
            return (Object.assign(Object.assign({}, t), { id: t._id.toString(), categories: ((_a = t.categories) !== null && _a !== void 0 ? _a : []).map((c) => {
                    var _a;
                    return (Object.assign(Object.assign({}, c), { id: c._id.toString(), subCategories: ((_a = c.subCategories) !== null && _a !== void 0 ? _a : []).map((s) => {
                            var _a;
                            return (Object.assign(Object.assign({}, s), { id: s._id.toString(), brands: ((_a = s.brands) !== null && _a !== void 0 ? _a : []).map((b) => {
                                    var _a;
                                    return (Object.assign(Object.assign({}, b), { id: b._id.toString(), models: ((_a = b.models) !== null && _a !== void 0 ? _a : []).map((m) => (Object.assign(Object.assign({}, m), { id: m._id.toString() }))) }));
                                }) }));
                        }) }));
                }) }));
        });
        res.json({ productTypes: normalized });
    }
    catch (err) {
        next(err);
    }
});
exports.getAll = getAll;
const create = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const productType = yield model_1.ProductType.create(req.body);
        res.status(201).json({ productType });
    }
    catch (err) {
        next(err);
    }
});
exports.create = create;
const update = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const _a = req.body, { id, title, slug } = _a, rest = __rest(_a, ["id", "title", "slug"]); // strip protected fields
        const productType = yield model_1.ProductType.findByIdAndUpdate(req.params.id, rest, { new: true });
        if (!productType)
            return res.status(404).json({ message: "Not found" });
        res.json({ productType });
    }
    catch (err) {
        next(err);
    }
});
exports.update = update;
const remove = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield model_1.ProductType.findByIdAndDelete(req.params.id);
        res.json({ message: "Deleted" });
    }
    catch (err) {
        next(err);
    }
});
exports.remove = remove;
