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
exports.myTransactions = void 0;
const model_1 = require("./model");
const myTransactions = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const type = req.query.type;
        const skip = (page - 1) * limit;
        const query = { userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id };
        if (type && type !== "all") {
            query.type = type;
        }
        const [items, total] = yield Promise.all([
            model_1.Transaction.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            model_1.Transaction.countDocuments(query),
        ]);
        res.status(200).json({
            transactions: items,
            total,
            page,
            pages: Math.ceil(total / limit),
        });
    }
    catch (error) {
        next(error);
    }
});
exports.myTransactions = myTransactions;
