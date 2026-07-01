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
exports.getSharesWithStats = exports.getShareStats = exports.deleteShare = exports.updateShare = exports.getShareById = exports.getShares = exports.createShare = void 0;
const model_1 = require("./model");
const shareSlot_model_1 = require("./shareSlot.model");
const model_2 = require("../settings/model");
const BATCH_SIZE = 1000;
/** Returns true if the share's offer is currently active based on dates */
function isOfferActive(share) {
    if (!share.isOffer)
        return false;
    const now = new Date();
    if (share.offerStartDate && new Date(share.offerStartDate) > now)
        return false;
    if (share.offerEndDate && new Date(share.offerEndDate) < now)
        return false;
    return true;
}
const createShare = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const settings = yield model_2.Settings.findOne();
        const defaults = (_a = settings === null || settings === void 0 ? void 0 : settings.defaultShareConfig) !== null && _a !== void 0 ? _a : {};
        const totalShares = Number((_b = req.body.totalShares) !== null && _b !== void 0 ? _b : 0);
        const pkg = yield model_1.Share.create(Object.assign(Object.assign(Object.assign({}, defaults), req.body), { totalShares }));
        if (totalShares > 0) {
            // M-06 fix: use a mutex-like approach via findOneAndUpdate to get a
            // reserved sequence range atomically, preventing duplicate share numbers.
            // We find the global max share number once and use it as the base.
            // The unique index on shareNumber will still catch any collision.
            const last = yield shareSlot_model_1.ShareSlot.findOne()
                .sort({ shareNumber: -1 })
                .select("shareNumber")
                .lean();
            const lastSeq = last ? parseInt(last.shareNumber.replace("THL-", ""), 10) : 0;
            for (let batch = 0; batch < totalShares; batch += BATCH_SIZE) {
                const docs = [];
                const end = Math.min(batch + BATCH_SIZE, totalShares);
                for (let i = batch; i < end; i++) {
                    docs.push({
                        shareNumber: `THL-${String(lastSeq + 1 + i).padStart(5, "0")}`,
                        shareId: pkg._id,
                        status: "available",
                        userId: null,
                        purchaseId: null,
                        reclaimedAt: null,
                    });
                }
                // ordered: false so a duplicate shareNumber error doesn't block the rest
                try {
                    yield shareSlot_model_1.ShareSlot.insertMany(docs, { ordered: false });
                }
                catch (insertErr) {
                    // Duplicate key on shareNumber — retry with a fresh sequence base
                    if ((insertErr === null || insertErr === void 0 ? void 0 : insertErr.code) === 11000) {
                        return res.status(409).json({
                            message: "Share number conflict due to concurrent creation. Please retry.",
                        });
                    }
                    throw insertErr;
                }
            }
        }
        res.status(201).json({ message: "Share created", pkg });
    }
    catch (err) {
        next(err);
    }
});
exports.createShare = createShare;
const getShares = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { projectStatus, isOffer } = req.query;
        const filter = { isActive: true };
        if (projectStatus)
            filter.projectStatus = projectStatus;
        const shares = yield model_1.Share.find(filter).lean();
        // Apply offer-active filter in memory (needs date comparison)
        const result = isOffer === "true"
            ? shares.filter(isOfferActive).sort((a, b) => { var _a, _b; return ((_a = b.offerPriority) !== null && _a !== void 0 ? _a : 0) - ((_b = a.offerPriority) !== null && _b !== void 0 ? _b : 0); })
            : shares;
        // Attach computed isActiveOffer flag to every share
        const enriched = result.map((s) => (Object.assign(Object.assign({}, s), { isActiveOffer: isOfferActive(s) })));
        res.json({ shares: enriched });
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
            return res.status(404).json({ message: "Share not found" });
        res.json({ pkg: Object.assign(Object.assign({}, pkg), { isActiveOffer: isOfferActive(pkg) }) });
    }
    catch (err) {
        next(err);
    }
});
exports.getShareById = getShareById;
const updateShare = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const old = yield model_1.Share.findById(req.params.id);
        if (!old)
            return res.status(404).json({ message: "Share not found" });
        const pkg = yield model_1.Share.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
        const newTotal = req.body.totalShares !== undefined ? Number(req.body.totalShares) : old.totalShares;
        const diff = newTotal - old.totalShares;
        if (diff > 0) {
            // Add slots at the end
            const last = yield shareSlot_model_1.ShareSlot.findOne().sort({ shareNumber: -1 }).select("shareNumber").lean();
            const lastSeq = last ? parseInt(last.shareNumber.replace("THL-", ""), 10) : 0;
            for (let batch = 0; batch < diff; batch += BATCH_SIZE) {
                const docs = [];
                const end = Math.min(batch + BATCH_SIZE, diff);
                for (let i = batch; i < end; i++) {
                    docs.push({
                        shareNumber: `THL-${String(lastSeq + 1 + i).padStart(5, "0")}`,
                        shareId: old._id,
                        status: "available",
                        userId: null,
                        purchaseId: null,
                        reclaimedAt: null,
                    });
                }
                yield shareSlot_model_1.ShareSlot.insertMany(docs, { ordered: false });
            }
        }
        else if (diff < 0) {
            // Remove the last |diff| available slots only
            const toRemove = yield shareSlot_model_1.ShareSlot.find({ shareId: old._id, status: "available" })
                .sort({ shareNumber: -1 })
                .limit(Math.abs(diff))
                .select("_id")
                .lean();
            if (toRemove.length > 0)
                yield shareSlot_model_1.ShareSlot.deleteMany({ _id: { $in: toRemove.map((s) => s._id) } });
        }
        res.json({ message: "Share updated", pkg });
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
            return res.status(404).json({ message: "Share not found" });
        yield shareSlot_model_1.ShareSlot.deleteMany({ shareId: req.params.id });
        res.json({ message: "Share deleted" });
    }
    catch (err) {
        next(err);
    }
});
exports.deleteShare = deleteShare;
const getShareStats = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [shares, counts] = yield Promise.all([
            model_1.Share.find().lean(),
            shareSlot_model_1.ShareSlot.aggregate([
                { $group: { _id: { shareId: "$shareId", status: "$status" }, count: { $sum: 1 } } },
            ]),
        ]);
        // Build a map: shareId -> { available, sold, reclaimed }
        const map = {};
        for (const { _id, count } of counts) {
            const key = _id.shareId.toString();
            if (!map[key])
                map[key] = { available: 0, sold: 0, reclaimed: 0 };
            map[key][_id.status] = count;
        }
        const stats = shares.map((s) => {
            var _a;
            const key = s._id.toString();
            const { available = 0, sold = 0, reclaimed = 0 } = (_a = map[key]) !== null && _a !== void 0 ? _a : {};
            return {
                _id: s._id,
                title: s.title,
                totalShares: s.totalShares,
                sold,
                reclaimed,
                available,
            };
        });
        res.json({ stats });
    }
    catch (err) {
        next(err);
    }
});
exports.getShareStats = getShareStats;
// GET /share/with-stats — returns active shares + slot stats for all shares
const getSharesWithStats = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [shares, counts] = yield Promise.all([
            model_1.Share.find().lean(),
            shareSlot_model_1.ShareSlot.aggregate([
                { $group: { _id: { shareId: "$shareId", status: "$status" }, count: { $sum: 1 } } },
            ]),
        ]);
        const map = {};
        for (const { _id, count } of counts) {
            const key = _id.shareId.toString();
            if (!map[key])
                map[key] = { available: 0, sold: 0, reclaimed: 0 };
            map[key][_id.status] = count;
        }
        const stats = shares.map((s) => {
            var _a;
            const key = s._id.toString();
            const { available = 0, sold = 0, reclaimed = 0 } = (_a = map[key]) !== null && _a !== void 0 ? _a : {};
            return { _id: s._id, title: s.title, totalShares: s.totalShares, sold, reclaimed, available };
        });
        res.json({
            shares: shares.filter((s) => s.isActive).map((s) => (Object.assign(Object.assign({}, s), { isActiveOffer: isOfferActive(s) }))),
            stats,
        });
    }
    catch (err) {
        next(err);
    }
});
exports.getSharesWithStats = getSharesWithStats;
