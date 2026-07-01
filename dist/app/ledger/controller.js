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
exports.getAllTransactions = exports.getLedger = void 0;
const model_1 = require("./model");
const model_2 = require("../wallet/model");
// H-08 fix: use next(err) instead of manual res.status(500)
const getLedger = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    try {
        const { type, from, to, page = "1", limit = "50" } = req.query;
        const filter = {};
        if (type)
            filter.type = type;
        if (from || to) {
            filter.date = {};
            if (from)
                filter.date.$gte = new Date(from);
            if (to) {
                const toDate = new Date(to);
                toDate.setHours(23, 59, 59, 999);
                filter.date.$lte = toDate;
            }
        }
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [entries, total, summary] = yield Promise.all([
            model_1.CompanyLedger.find(filter)
                .populate("userId", "name username phone")
                .sort({ date: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            model_1.CompanyLedger.countDocuments(filter),
            model_1.CompanyLedger.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: null,
                        totalInflow: { $sum: { $cond: [{ $in: ["$type", model_1.INFLOW_TYPES] }, "$amount", 0] } },
                        totalOutflow: { $sum: { $cond: [{ $in: ["$type", model_1.OUTFLOW_TYPES] }, "$amount", 0] } },
                    },
                },
            ]),
        ]);
        res.json({
            entries,
            total,
            totalInflow: (_b = (_a = summary[0]) === null || _a === void 0 ? void 0 : _a.totalInflow) !== null && _b !== void 0 ? _b : 0,
            totalOutflow: (_d = (_c = summary[0]) === null || _c === void 0 ? void 0 : _c.totalOutflow) !== null && _d !== void 0 ? _d : 0,
            net: ((_f = (_e = summary[0]) === null || _e === void 0 ? void 0 : _e.totalInflow) !== null && _f !== void 0 ? _f : 0) - ((_h = (_g = summary[0]) === null || _g === void 0 ? void 0 : _g.totalOutflow) !== null && _h !== void 0 ? _h : 0),
            page: parseInt(page),
            limit: parseInt(limit),
        });
    }
    catch (err) {
        next(err); // H-08 fix
    }
});
exports.getLedger = getLedger;
const getAllTransactions = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, type, from, to, page = "1", limit = "50" } = req.query;
        const filter = {};
        if (userId)
            filter.userId = userId;
        if (type)
            filter.type = type;
        if (from || to) {
            filter.createdAt = {};
            if (from)
                filter.createdAt.$gte = new Date(from);
            if (to) {
                const toDate = new Date(to);
                toDate.setHours(23, 59, 59, 999);
                filter.createdAt.$lte = toDate;
            }
        }
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [transactions, total] = yield Promise.all([
            model_2.TransactionLog.find(filter)
                .populate("userId", "name username phone")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            model_2.TransactionLog.countDocuments(filter),
        ]);
        res.json({ transactions, total, page: parseInt(page), limit: parseInt(limit) });
    }
    catch (err) {
        next(err); // H-08 fix
    }
});
exports.getAllTransactions = getAllTransactions;
