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
exports.remove = exports.update = exports.getOne = exports.getAll = exports.create = void 0;
const model_1 = require("./model");
const service_1 = require("./service");
const create = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const capital = yield (0, service_1.createCapital)((0, service_1.parseCapitalInput)(req.body), req.user._id);
        res.status(201).json({ message: "Capital entry created", capital });
    }
    catch (error) {
        next(error);
    }
});
exports.create = create;
const getAll = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { search = "", from, to, page = "1", limit = "20", sort = "date", order = "desc" } = req.query;
        const currentPage = Math.max(1, Number.parseInt(page, 10) || 1);
        const pageLimit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 20));
        const filter = {};
        if (search.trim()) {
            const expression = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
            filter.$or = [{ description: expression }, { paidBy: expression }, { voucherNo: expression }, { paymentInfo: expression }];
        }
        if (from || to) {
            filter.date = {};
            if (from)
                filter.date.$gte = new Date(from);
            if (to) {
                const end = new Date(to);
                end.setHours(23, 59, 59, 999);
                filter.date.$lte = end;
            }
        }
        const sortFields = new Set(["date", "amount", "createdAt", "paidBy", "voucherNo"]);
        const sortField = sortFields.has(sort) ? sort : "date";
        const sortDirection = order === "asc" ? 1 : -1;
        const [capitals, total] = yield Promise.all([
            model_1.Capital.find(filter).sort({ [sortField]: sortDirection, _id: -1 }).skip((currentPage - 1) * pageLimit).limit(pageLimit).lean(),
            model_1.Capital.countDocuments(filter),
        ]);
        res.json({ capitals, total, page: currentPage, limit: pageLimit, pages: Math.ceil(total / pageLimit) });
    }
    catch (error) {
        next(error);
    }
});
exports.getAll = getAll;
const getOne = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const capital = yield model_1.Capital.findById(req.params.id).lean();
        if (!capital)
            return res.status(404).json({ message: "Capital entry not found" });
        res.json({ capital });
    }
    catch (error) {
        next(error);
    }
});
exports.getOne = getOne;
const update = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const capital = yield (0, service_1.updateCapital)(req.params.id, (0, service_1.parseCapitalInput)(req.body), req.user._id);
        res.json({ message: "Capital entry updated", capital });
    }
    catch (error) {
        next(error);
    }
});
exports.update = update;
const remove = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield (0, service_1.deleteCapital)(req.params.id);
        res.json({ message: "Capital entry deleted" });
    }
    catch (error) {
        next(error);
    }
});
exports.remove = remove;
