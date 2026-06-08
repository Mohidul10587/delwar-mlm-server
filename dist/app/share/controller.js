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
exports.deleteShare = exports.updateShare = exports.getShareById = exports.getShares = exports.createShare = void 0;
const model_1 = require("./model");
const model_2 = require("../settings/model");
const createShare = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const settings = yield model_2.Settings.findOne();
        const defaultCommissions = (_a = settings === null || settings === void 0 ? void 0 : settings.defaultCommissions) !== null && _a !== void 0 ? _a : {
            directSalesCommissionForCashSell: 0,
            directSalesCommissionForInstallmentSell: 0,
            managerialCommissionForCashSell: 0,
            managerialCommissionForInstallmentSell: 0,
        };
        const pkg = yield model_1.Share.create(Object.assign({ directSalesCommissionForCashSell: defaultCommissions.directSalesCommissionForCashSell, directSalesCommissionForInstallmentSell: defaultCommissions.directSalesCommissionForInstallmentSell, managerialCommissionForCashSell: defaultCommissions.managerialCommissionForCashSell, managerialCommissionForInstallmentSell: defaultCommissions.managerialCommissionForInstallmentSell }, req.body));
        res.status(201).json({ message: "Share created", pkg });
    }
    catch (err) {
        next(err);
    }
});
exports.createShare = createShare;
const getShares = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const shares = yield model_1.Share.find({ isActive: true }).lean();
        res.json({ shares });
    }
    catch (err) {
        next(err);
    }
});
exports.getShares = getShares;
const getShareById = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const pkg = yield model_1.Share.findById(req.params.id).lean();
        if (!pkg)
            return res.status(404).json({
                message: "Share not found",
            });
        res.json({ pkg });
    }
    catch (err) {
        next(err);
    }
});
exports.getShareById = getShareById;
const updateShare = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const pkg = yield model_1.Share.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
        if (!pkg)
            return res.status(404).json({
                message: "Share not found",
            });
        res.json({
            message: "Share updated",
            pkg,
        });
    }
    catch (err) {
        next(err);
    }
});
exports.updateShare = updateShare;
const deleteShare = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const pkg = yield model_1.Share.findByIdAndDelete(req.params.id);
        if (!pkg)
            return res.status(404).json({
                message: "Share not found",
            });
        res.json({
            message: "Share deleted",
        });
    }
    catch (err) {
        next(err);
    }
});
exports.deleteShare = deleteShare;
