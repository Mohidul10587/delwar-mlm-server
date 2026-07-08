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
exports.reclaimShares = exports.updatePurchaseStatus = void 0;
const model_1 = require("./model");
const service_1 = require("./service");
const model_2 = require("../certificate/model");
const commissions_1 = require("./commissions");
const model_3 = require("../user/model");
const model_4 = require("../ledger/model");
const shareSlot_model_1 = require("../project/shareSlot.model");
const model_5 = require("../project/model");
const controller_1 = require("../rank/controller");
// ── Share allocation helpers ──────────────────────────────────────────────────
/**
 * Fix F-01: Allocates share slots atomically to prevent race conditions.
 * Each slot is updated one-by-one with a status=available guard so that
 * two concurrent approvals cannot grab the same slot.
 */
function allocateShares(purchase) {
    return __awaiter(this, void 0, void 0, function* () {
        // Find available slot IDs first
        const available = yield shareSlot_model_1.ShareSlot.find({
            projectId: purchase.projectId,
            status: "available",
        })
            .sort({ shareNumber: 1 })
            .limit(purchase.quantity)
            .select("_id")
            .lean();
        if (available.length < purchase.quantity) {
            return {
                error: `Only ${available.length} share slot(s) available, ${purchase.quantity} required`,
            };
        }
        // Fix F-01: Atomically claim each slot — only succeeds if status is still "available"
        let claimed = 0;
        const claimedIds = [];
        for (const slot of available) {
            const updated = yield shareSlot_model_1.ShareSlot.findOneAndUpdate({ _id: slot._id, status: "available" }, // atomic guard
            {
                $set: {
                    status: "sold",
                    userId: purchase.userId,
                    purchaseId: purchase._id,
                },
            }, { new: true });
            if (updated) {
                claimed++;
                claimedIds.push(slot._id);
            }
        }
        if (claimed < purchase.quantity) {
            // Roll back whatever we already claimed
            if (claimedIds.length > 0) {
                yield shareSlot_model_1.ShareSlot.updateMany({ _id: { $in: claimedIds } }, { $set: { status: "available", userId: null, purchaseId: null } });
            }
            return {
                error: `Only ${claimed} slot(s) could be allocated (concurrent conflict). Please retry.`,
            };
        }
        return null;
    });
}
/**
 * Reclaims all sold share slots belonging to a purchase.
 */
function reclaimPurchaseShares(purchaseId) {
    return __awaiter(this, void 0, void 0, function* () {
        const result = yield shareSlot_model_1.ShareSlot.updateMany({ purchaseId, status: "sold" }, {
            $set: {
                status: "reclaimed",
                reclaimedAt: new Date(),
                userId: null,
                purchaseId: null,
            },
        });
        return result.modifiedCount;
    });
}
/**
 * After a purchase approval allocates slots, check whether all slots for the
 * parent share are now sold. If so, automatically set projectStatus = "complete".
 *
 * Rules (per requirement):
 * - Full/cash purchase: slots are allocated on purchase approval → check here.
 * - Installment purchase: down payment approval = purchase approval → same path.
 * - Only "sold" slots count; "available" and "reclaimed" do not.
 */
function checkAndCompleteShare(projectId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const share = yield model_5.Project.findById(projectId)
                .select("totalShares projectStatus")
                .lean();
            if (!share || share.projectStatus === "complete")
                return;
            if (!share.totalShares || share.totalShares <= 0)
                return;
            const soldCount = yield shareSlot_model_1.ShareSlot.countDocuments({
                projectId,
                status: "sold",
            });
            if (soldCount >= share.totalShares) {
                yield model_5.Project.findByIdAndUpdate(projectId, {
                    $set: { projectStatus: "complete" },
                });
            }
        }
        catch (err) {
            // Non-critical — log and continue; do not block the approval response
            console.error(`[SHARE COMPLETE] checkAndCompleteShare failed for projectId=${projectId}:`, err);
        }
    });
}
// ── Update Purchase Status (Approve / Reject) ─────────────────────────────────
const updatePurchaseStatus = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    try {
        const { status, reviewNote } = req.body;
        if (!["approved", "rejected"].includes(status))
            return res.status(400).json({ message: "Invalid status" });
        if (status === "rejected" && !String(reviewNote !== null && reviewNote !== void 0 ? reviewNote : "").trim())
            return res.status(400).json({ message: "Rejection reason is required" });
        const purchase = yield model_1.Purchase.findById(req.params.id);
        if (!purchase)
            return res.status(404).json({ message: "Purchase not found" });
        const wasAlreadyApproved = purchase.status === "approved";
        // Step 1 — Allocate share slots (only on first approval)
        if (status === "approved" && !wasAlreadyApproved) {
            const allocationError = yield allocateShares(purchase);
            if (allocationError) {
                return res.status(400).json({ message: allocationError.error });
            }
        }
        // Step 2 — For cash: mark full amount as paid
        if (status === "approved" &&
            !wasAlreadyApproved &&
            purchase.paymentType === "cash") {
            const fullAmount = purchase.snapshot.cashPrice * purchase.quantity;
            if (fullAmount > purchase.amountPaid) {
                purchase.amountPaid = fullAmount;
            }
        }
        // Step 3 — Save purchase status
        purchase.status = status;
        purchase.reviewNote = String(reviewNote !== null && reviewNote !== void 0 ? reviewNote : "").trim();
        purchase.reviewedBy = req.user._id;
        purchase.reviewedAt = new Date();
        yield purchase.save();
        // Respond immediately
        res.json({ message: `Purchase ${status}`, purchase });
        if (status === "approved" && !wasAlreadyApproved) {
            // Step 4 — User personal shares count
            yield model_3.User.findByIdAndUpdate(purchase.userId, {
                $inc: { personalPurchaseCount: purchase.quantity },
            });
            // Step 4b — Recalc buyer's own rank (Rank 2 depends on personal purchase count)
            yield (0, controller_1.recalcUserRank)(purchase.userId.toString());
            // Step 5 — Fix P-02: await commission distribution so errors are caught
            if (!purchase.commissionProcessed) {
                yield (0, commissions_1.distributeCommissions)(purchase._id.toString());
            }
            // Step 6 — Ledger entry
            const buyer = yield model_3.User.findById(purchase.userId)
                .select("name username")
                .lean();
            const buyerName = (_a = buyer === null || buyer === void 0 ? void 0 : buyer.name) !== null && _a !== void 0 ? _a : "";
            const buyerUsername = (_b = buyer === null || buyer === void 0 ? void 0 : buyer.username) !== null && _b !== void 0 ? _b : "";
            try {
                yield model_4.CompanyLedger.create({
                    date: new Date(),
                    type: "purchase_received",
                    amount: purchase.amountPaid,
                    relatedId: purchase._id,
                    relatedModel: "Purchase",
                    userId: purchase.userId,
                    note: `Purchase approved — ${(_d = (_c = purchase.snapshot) === null || _c === void 0 ? void 0 : _c.shareTitle) !== null && _d !== void 0 ? _d : ""} x${purchase.quantity} [${purchase.paymentType}] — Buyer: ${buyerName} (@${buyerUsername}), ৳${purchase.amountPaid.toLocaleString()}`,
                });
            }
            catch (ledgerErr) {
                // Fix E-02: log ledger failures — do not silently swallow
                console.error(`[LEDGER ERROR] Failed to create purchase_received ledger for purchaseId=${purchase._id}:`, ledgerErr);
            }
            // Step 7 — Auto-complete share if all slots are now sold
            yield checkAndCompleteShare(purchase.projectId);
        }
        // Step 8 — Update certificate status
        const purchaseWithShare = yield model_1.Purchase.findById(purchase._id)
            .populate("projectId", "cashPrice")
            .lean();
        if (purchaseWithShare) {
            const projectPrice = Number((_f = (_e = purchaseWithShare === null || purchaseWithShare === void 0 ? void 0 : purchaseWithShare.projectId) === null || _e === void 0 ? void 0 : _e.cashPrice) !== null && _f !== void 0 ? _f : 0);
            const totalPayable = (0, service_1.calculateTotalPayable)(projectPrice, purchaseWithShare.quantity);
            const certificateStatus = (0, service_1.calculateCertificateStatus)({
                status: purchaseWithShare.status,
                paymentType: purchaseWithShare.paymentType,
                amountPaid: purchaseWithShare.amountPaid,
                totalPayable,
            });
            yield model_2.Certificate.findOneAndUpdate({ purchaseId: purchase._id }, {
                status: certificateStatus,
                issuedAt: certificateStatus === "issued" ? new Date() : undefined,
            }, { upsert: true, new: true });
        }
    }
    catch (err) {
        next(err);
    }
});
exports.updatePurchaseStatus = updatePurchaseStatus;
// ── Reclaim Shares (Installment Default) ─────────────────────────────────────
const reclaimShares = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const purchase = yield model_1.Purchase.findById(req.params.purchaseId);
        if (!purchase)
            return res.status(404).json({ message: "Purchase not found" });
        const reclaimed = yield reclaimPurchaseShares(purchase._id);
        if (reclaimed === 0) {
            return res.status(404).json({
                message: "No sold share slots found for this purchase",
            });
        }
        res.json({
            message: `${reclaimed} share slot(s) reclaimed`,
            reclaimed,
        });
    }
    catch (err) {
        next(err);
    }
});
exports.reclaimShares = reclaimShares;
