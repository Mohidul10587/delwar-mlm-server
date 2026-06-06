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
exports.getReferrals = exports.getUpline = exports.getDownline = void 0;
const model_1 = require("../user/model");
const buildTreeFromFlat = (nodes, parentId) => nodes
    .filter(n => { var _a, _b, _c; return ((_c = (_b = (_a = n.placementAncestors) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.userId) === null || _c === void 0 ? void 0 : _c.toString()) === parentId; })
    .map(n => {
    var _a, _b, _c;
    return ({
        _id: n._id.toString(),
        username: n.username,
        name: n.name,
        placementSide: (_c = (_b = (_a = n.placementAncestors) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.side) !== null && _c !== void 0 ? _c : null,
        children: buildTreeFromFlat(nodes, n._id.toString()),
    });
});
const getDownline = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const all = yield model_1.User.find({ "placementAncestors.userId": req.user._id })
            .select("_id username name placementAncestors")
            .lean();
        res.json({ tree: buildTreeFromFlat(all, req.user._id.toString()) });
    }
    catch (err) {
        next(err);
    }
});
exports.getDownline = getDownline;
const getUpline = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const me = yield model_1.User.findById(req.user._id).select("placementAncestors").lean();
        const level1 = (_a = me === null || me === void 0 ? void 0 : me.placementAncestors) === null || _a === void 0 ? void 0 : _a[0];
        if (!level1)
            return res.json({ upline: null });
        const parent = yield model_1.User.findById(level1.userId).select("_id username name").lean();
        if (!parent)
            return res.json({ upline: null });
        res.json({ upline: { _id: parent._id.toString(), username: parent.username, name: parent.name, placementSide: (_b = level1.side) !== null && _b !== void 0 ? _b : null } });
    }
    catch (err) {
        next(err);
    }
});
exports.getUpline = getUpline;
const getReferrals = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const referrals = yield model_1.User.find({ "generationAncestors.0.userId": req.user._id }).select("_id username name phone createdAt").lean();
        res.json({ referrals });
    }
    catch (err) {
        next(err);
    }
});
exports.getReferrals = getReferrals;
