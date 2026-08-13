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
exports.getSharesWithStats = exports.getShareStats = exports.backfillSlots = exports.unsetCoverSlider = exports.setCoverSlider = exports.getCoverSlider = exports.deleteShare = exports.updateShare = exports.getShareById = exports.getSharesAdmin = exports.getShares = exports.createShare = void 0;
const model_1 = require("./model");
const shareSlot_model_1 = require("./shareSlot.model");
const model_2 = require("../settings/model");
const counter_1 = require("../user/counter");
const generateId_1 = require("../../utils/generateId");
const BATCH_SIZE = 1000;
/**
 * Generate a unique, readable share number using project ID and sequential counter
 * Format: ADPBL-{projectPrefix}-{sequentialNumber}
 * Example: ADPBL-A1B2-00001, ADPBL-C3D4-00002
 */
function generateShareNumber(projectId, sequentialNumber) {
    // Take first 2 and last 2 characters from project ID to create a unique prefix
    const projectPrefix = projectId.slice(-4).toUpperCase();
    const paddedNumber = String(sequentialNumber).padStart(4, "0");
    return `ADPBL-${projectPrefix}-${paddedNumber}`;
}
/**
 * Atomically reserves `count` sequential share numbers for a specific project
 * and returns the first number in the reserved range.
 *
 * Uses a MongoDB findOneAndUpdate with $inc so that concurrent requests
 * never get overlapping ranges — eliminating the duplicate-key collision
 * that the old findOne().sort() approach suffered from.
 */
function reserveShareRange(projectId, count) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        // Use project-specific counter to ensure uniqueness per project
        const counterId = `share-seq-${projectId}`;
        const doc = yield counter_1.Counter.findOneAndUpdate({ _id: counterId }, { $inc: { seq: count } }, { new: false, upsert: true });
        // doc.seq is the value *before* the increment — that is our start offset.
        // If upserting for the first time, doc may be null; treat as 0.
        return (_a = doc === null || doc === void 0 ? void 0 : doc.seq) !== null && _a !== void 0 ? _a : 0;
    });
}
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
        const projectId = yield (0, generateId_1.generateCustomId)("PRJ");
        const pkg = yield model_1.Project.create(Object.assign(Object.assign(Object.assign({}, defaults), req.body), { totalShares, projectId }));
        if (totalShares > 0) {
            // Atomically reserve a range of `totalShares` sequential numbers for this project.
            // reserveShareRange returns the value *before* incrementing, so
            // slot numbers are: start+1 … start+totalShares (1-based).
            const start = yield reserveShareRange(pkg._id.toString(), totalShares);
            for (let batch = 0; batch < totalShares; batch += BATCH_SIZE) {
                const docs = [];
                const end = Math.min(batch + BATCH_SIZE, totalShares);
                for (let i = batch; i < end; i++) {
                    docs.push({
                        shareNumber: generateShareNumber(pkg._id.toString(), start + 1 + i),
                        projectId: pkg._id,
                        status: "available",
                        userId: null,
                        purchaseId: null,
                        reclaimedAt: null,
                    });
                }
                yield shareSlot_model_1.ShareSlot.insertMany(docs, { ordered: true });
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
        // Public endpoint: only show active shares to users
        const filter = { isActive: true };
        if (projectStatus)
            filter.projectStatus = projectStatus;
        const shares = yield model_1.Project.find(filter).lean();
        // Apply offer-active filter in memory (needs date comparison)
        const result = isOffer === "true"
            ? shares
                .filter(isOfferActive)
                .sort((a, b) => { var _a, _b; return ((_a = b.offerPriority) !== null && _a !== void 0 ? _a : 0) - ((_b = a.offerPriority) !== null && _b !== void 0 ? _b : 0); })
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
// GET /share/admin — returns ALL shares (including inactive) for admin panel
const getSharesAdmin = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { projectStatus } = req.query;
        const filter = {};
        if (projectStatus)
            filter.projectStatus = projectStatus;
        const shares = yield model_1.Project.find(filter).lean();
        const enriched = shares.map((s) => (Object.assign(Object.assign({}, s), { isActiveOffer: isOfferActive(s) })));
        res.json({ shares: enriched });
    }
    catch (err) {
        next(err);
    }
});
exports.getSharesAdmin = getSharesAdmin;
const getShareById = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const pkg = yield model_1.Project.findById(req.params.id).lean();
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
        const old = yield model_1.Project.findById(req.params.id);
        if (!old)
            return res.status(404).json({ message: "Share not found" });
        const pkg = yield model_1.Project.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
        const newTotal = req.body.totalShares !== undefined
            ? Number(req.body.totalShares)
            : old.totalShares;
        const diff = newTotal - old.totalShares;
        if (diff > 0) {
            // Atomically reserve `diff` sequential numbers for this project
            const start = yield reserveShareRange(old._id.toString(), diff);
            for (let batch = 0; batch < diff; batch += BATCH_SIZE) {
                const docs = [];
                const end = Math.min(batch + BATCH_SIZE, diff);
                for (let i = batch; i < end; i++) {
                    docs.push({
                        shareNumber: generateShareNumber(old._id.toString(), start + 1 + i),
                        projectId: old._id,
                        status: "available",
                        userId: null,
                        purchaseId: null,
                        reclaimedAt: null,
                    });
                }
                yield shareSlot_model_1.ShareSlot.insertMany(docs, { ordered: true });
            }
        }
        else if (diff < 0) {
            // Remove the last |diff| available slots only
            const toRemove = yield shareSlot_model_1.ShareSlot.find({
                projectId: old._id,
                status: "available",
            })
                .sort({ shareNumber: -1 })
                .limit(Math.abs(diff))
                .select("_id")
                .lean();
            if (toRemove.length > 0)
                yield shareSlot_model_1.ShareSlot.deleteMany({
                    _id: { $in: toRemove.map((s) => s._id) },
                });
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
        const projectId = req.params.id;
        const { force } = req.query; // Allow force deletion with ?force=true
        // Check if project exists
        const pkg = yield model_1.Project.findById(projectId);
        if (!pkg)
            return res.status(404).json({ message: "Share not found" });
        // Count share slots by status
        const slotStats = yield shareSlot_model_1.ShareSlot.aggregate([
            { $match: { projectId: pkg._id } },
            { $group: { _id: "$status", count: { $sum: 1 } } },
        ]);
        const stats = {};
        slotStats.forEach((stat) => {
            stats[stat._id] = stat.count;
        });
        const totalSlots = Object.values(stats).reduce((sum, count) => sum + count, 0);
        const soldSlots = stats.sold || 0;
        const reclaimedSlots = stats.reclaimed || 0;
        const availableSlots = stats.available || 0;
        console.log(`🗑️  Attempting to delete project "${pkg.title}":`);
        console.log(`   - Total slots: ${totalSlots}`);
        console.log(`   - Available: ${availableSlots}`);
        console.log(`   - Sold: ${soldSlots}`);
        console.log(`   - Reclaimed: ${reclaimedSlots}`);
        // Safety check: prevent deletion if there are sold slots (unless forced)
        if (soldSlots > 0 && force !== "true") {
            return res.status(400).json({
                message: "Cannot delete project with sold shares",
                error: "SHARES_SOLD",
                details: {
                    projectTitle: pkg.title,
                    totalSlots,
                    soldSlots,
                    availableSlots,
                    reclaimedSlots,
                },
                hint: "Use ?force=true to force delete (this will remove purchase history)",
            });
        }
        // Warning if forced deletion with sold slots
        if (soldSlots > 0 && force === "true") {
            console.log(`⚠️  FORCE DELETION: Removing project with ${soldSlots} sold shares!`);
        }
        // Delete project and all related share slots in parallel for efficiency
        const [deletedProject, deletedSlots] = yield Promise.all([
            model_1.Project.findByIdAndDelete(projectId),
            shareSlot_model_1.ShareSlot.deleteMany({ projectId }),
        ]);
        // Clean up the project-specific counter
        const counterId = `share-seq-${projectId}`;
        const counterResult = yield counter_1.Counter.deleteOne({ _id: counterId });
        console.log(`✅ Project deleted successfully:`);
        console.log(`   - Project: ${pkg.title}`);
        console.log(`   - Share slots removed: ${deletedSlots.deletedCount}`);
        console.log(`   - Counter cleaned: ${counterId} (${counterResult.deletedCount > 0 ? "found & deleted" : "not found"})`);
        res.json({
            message: "Project deleted successfully",
            deletedShareSlots: deletedSlots.deletedCount,
            projectTitle: pkg.title,
            forced: force === "true",
            warning: soldSlots > 0 ? `${soldSlots} sold shares were also deleted` : null,
            stats: {
                totalSlots,
                soldSlots,
                availableSlots,
                reclaimedSlots,
            },
        });
    }
    catch (err) {
        console.error("❌ Error deleting project:", err);
        next(err);
    }
});
exports.deleteShare = deleteShare;
// GET /share/cover-slider — public endpoint, returns merged images of all active cover slider shares
const getCoverSlider = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const shares = yield model_1.Project.find({
            isCoverSlider: true,
            isActive: true,
        }).lean();
        if (!shares.length)
            return res.json({ images: [], shareIds: [], titles: [] });
        // Merge all images from all selected cover slider shares
        const images = shares.flatMap((s) => { var _a; return (_a = s.images) !== null && _a !== void 0 ? _a : []; });
        const shareIds = shares.map((s) => s._id);
        const titles = shares.map((s) => s.title);
        res.json({ images, shareIds, titles });
    }
    catch (err) {
        next(err);
    }
});
exports.getCoverSlider = getCoverSlider;
// PATCH /share/:id/set-cover-slider — admin toggles a share in/out of the cover slider
const setCoverSlider = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const share = yield model_1.Project.findById(req.params.id);
        if (!share)
            return res.status(404).json({ message: "Share not found" });
        if (!share.isActive)
            return res
                .status(400)
                .json({ message: "Cannot set an inactive share as cover slider" });
        // Toggle: if already set, unset it; otherwise add it to the cover slider
        share.isCoverSlider = true;
        yield share.save();
        res.json({ message: "Cover slider updated", projectId: share._id });
    }
    catch (err) {
        next(err);
    }
});
exports.setCoverSlider = setCoverSlider;
// PATCH /share/:id/unset-cover-slider — remove cover slider designation
const unsetCoverSlider = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const share = yield model_1.Project.findByIdAndUpdate(req.params.id, { $set: { isCoverSlider: false } }, { new: true });
        if (!share)
            return res.status(404).json({ message: "Share not found" });
        res.json({ message: "Cover slider removed" });
    }
    catch (err) {
        next(err);
    }
});
exports.unsetCoverSlider = unsetCoverSlider;
// POST /share/:id/backfill-slots — creates missing available slots so that
// the total slot count matches share.totalShares. Safe to call multiple times.
const backfillSlots = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const share = yield model_1.Project.findById(req.params.id);
        if (!share)
            return res.status(404).json({ message: "Share not found" });
        const desired = (_a = share.totalShares) !== null && _a !== void 0 ? _a : 0;
        if (desired === 0)
            return res.json({
                message: "Share has 0 totalShares — nothing to backfill",
                created: 0,
            });
        const existing = yield shareSlot_model_1.ShareSlot.countDocuments({ projectId: share._id });
        const diff = desired - existing;
        if (diff <= 0) {
            return res.json({
                message: "Slots already up to date",
                created: 0,
                total: existing,
            });
        }
        // Atomically reserve `diff` sequential numbers for this project
        const start = yield reserveShareRange(share._id.toString(), diff);
        let created = 0;
        for (let batch = 0; batch < diff; batch += BATCH_SIZE) {
            const docs = [];
            const end = Math.min(batch + BATCH_SIZE, diff);
            for (let i = batch; i < end; i++) {
                docs.push({
                    shareNumber: generateShareNumber(share._id.toString(), start + 1 + i),
                    projectId: share._id,
                    status: "available",
                    userId: null,
                    purchaseId: null,
                    reclaimedAt: null,
                });
            }
            const result = yield shareSlot_model_1.ShareSlot.insertMany(docs, { ordered: true });
            created += result.length;
        }
        res.json({
            message: `Backfilled ${created} slots`,
            created,
            total: existing + created,
        });
    }
    catch (err) {
        next(err);
    }
});
exports.backfillSlots = backfillSlots;
const getShareStats = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [shares, counts] = yield Promise.all([
            model_1.Project.find().lean(),
            shareSlot_model_1.ShareSlot.aggregate([
                {
                    $group: {
                        _id: { projectId: "$projectId", status: "$status" },
                        count: { $sum: 1 },
                    },
                },
            ]),
        ]);
        // Build a map: projectId -> { available, sold, reclaimed }
        const map = {};
        for (const { _id, count } of counts) {
            const key = _id.projectId.toString();
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
// GET /share/with-stats — returns active shares + slot stats for all shares (admin panel)
const getSharesWithStats = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [shares, counts] = yield Promise.all([
            // Admin panel sees ALL shares (including inactive)
            model_1.Project.find().lean(),
            shareSlot_model_1.ShareSlot.aggregate([
                {
                    $group: {
                        _id: { projectId: "$projectId", status: "$status" },
                        count: { $sum: 1 },
                    },
                },
            ]),
        ]);
        const map = {};
        for (const { _id, count } of counts) {
            const key = _id.projectId.toString();
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
        res.json({
            // Return all shares to admin (both active and inactive), with isActiveOffer flag
            shares: shares.map((s) => (Object.assign(Object.assign({}, s), { isActiveOffer: isOfferActive(s) }))),
            stats,
        });
    }
    catch (err) {
        next(err);
    }
});
exports.getSharesWithStats = getSharesWithStats;
