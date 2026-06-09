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
exports.distributeCommissions = void 0;
const model_1 = require("./model");
const commissionDebug_model_1 = require("./commissionDebug.model");
const model_2 = require("../wallet/model");
const model_3 = require("../user/model");
const model_4 = require("../settings/model");
const controller_1 = require("../rank/controller");
/**
 * একটি purchase অনুমোদিত হলে সমস্ত কমিশন বিতরণ করে।
 *
 * এই ফাংশনটি তিনটি কাজ করে:
 *
 * ১. ডাইরেক্ট সেলস কমিশন:
 *    ক্রেতার referrer (যিনি তাকে রেফার করেছেন) তাৎক্ষণিকভাবে
 *    তার মূল ওয়ালেটে (balance) কমিশন পান।
 *    নগদ ক্রয়ে নগদ রেট, কিস্তিতে কিস্তির রেট প্রযোজ্য।
 *    referrer-এর directSalesCount-ও বাড়ানো হয় (র্যাংক হিসাবের জন্য)।
 *
 * ২. ম্যানেজারিয়াল (জেনারেশন) কমিশন:
 *    ক্রেতার placementParent থেকে শুরু করে উপরের দিকে
 *    সর্বোচ্চ maxGenerations পর্যন্ত প্রতিটি ancestor-কে
 *    তাদের commissionBalance-এ কমিশন জমা হয়।
 *    (এই ব্যালেন্স সরাসরি উইথড্র করা যায় না — admin সাপ্তাহিক পোস্ট করেন।)
 *    প্রতিটি ancestor-এর teamSalesCount-ও বাড়ানো হয় (র্যাংক হিসাবের জন্য)।
 *
 * ৩. টিম ম্যানেজমেন্ট কমিশনের জন্য Side ভলিউম আপডেট:
 *    প্রতিটি ancestor-এর parent-এর ওয়ালেটে sideA বা sideB ভলিউম
 *    যোগ করা হয়, যাতে পরে cron job সঠিকভাবে টিম কমিশন হিসাব করতে পারে।
 *
 * সব শেষে purchase.commissionProcessed = true করা হয়
 * যাতে একই purchase-এ দ্বিতীয়বার কমিশন না যায়।
 *
 * @param purchaseId - যে purchase-এর জন্য কমিশন বিতরণ করতে হবে তার ID
 */
const distributeCommissions = (purchaseId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    try {
        // purchase ও তার share তথ্য একসাথে লোড করা হচ্ছে
        const purchase = yield model_1.Purchase.findById(purchaseId).populate("shareId");
        // যদি purchase না পাওয়া যায় অথবা আগেই কমিশন দেওয়া হয়ে থাকে, তাহলে বন্ধ করো
        if (!purchase || purchase.commissionProcessed)
            return;
        const share = purchase.shareId;
        // ক্রেতার referrer ও placementParent জানার জন্য buyer লোড করা হচ্ছে
        const buyer = yield model_3.User.findById(purchase.userId).select("generationAncestors placementAncestors name username");
        if (!buyer)
            return;
        // ancestor arrays থেকে direct parent/referrer derive করা হচ্ছে
        const referrerId = (_b = (_a = buyer.generationAncestors[0]) === null || _a === void 0 ? void 0 : _a.userId) !== null && _b !== void 0 ? _b : null;
        const placementParentId = (_d = (_c = buyer.placementAncestors[0]) === null || _c === void 0 ? void 0 : _c.userId) !== null && _d !== void 0 ? _d : null;
        // সিস্টেম সেটিংস থেকে সর্বোচ্চ জেনারেশন সংখ্যা ও প্রতিটি জেনারেশনের রেট নেওয়া হচ্ছে
        const settings = yield model_4.Settings.findOne();
        const maxGen = (_e = settings === null || settings === void 0 ? void 0 : settings.maxGenerations) !== null && _e !== void 0 ? _e : 5;
        const genRates = (_f = settings === null || settings === void 0 ? void 0 : settings.generationCommission) !== null && _f !== void 0 ? _f : [];
        const debugEntries = [];
        // ── ১. ডাইরেক্ট সেলস কমিশন ──────────────────────────────────────────────
        if (referrerId) {
            const referrer = yield model_3.User.findById(referrerId).select("name username");
            const referrerLabel = referrer ? `${referrer.name} (${referrer.username})` : referrerId.toString();
            const rate = purchase.paymentType === "cash"
                ? share.directSalesCommissionForCashSell
                : share.directSalesCommissionForInstallmentSell;
            const base = purchase.paymentType === "cash"
                ? share.cashPrice * purchase.quantity
                : share.installment.downPayment * purchase.quantity;
            const commission = (rate / 100) * base;
            if (commission > 0) {
                // referrer-এর ওয়ালেটে সরাসরি balance-এ যোগ (তাৎক্ষণিক)
                const wallet = yield model_2.Wallet.findOne({ userId: referrerId });
                if (!wallet)
                    return;
                const before = wallet.balance;
                wallet.balance += commission;
                yield wallet.save();
                debugEntries.push({ userId: referrerId, role: "referrer_direct", field: "balance", before, added: commission, after: wallet.balance, description: `ডাইরেক্ট সেলস কমিশন (${rate}%): purchase #${purchase._id} থেকে referrer ${referrerLabel}-এর balance-এ ৳${commission} যোগ হয়েছে। আগে ছিল ৳${before}, এখন ৳${wallet.balance}।` });
                yield model_2.TransactionLog.create({
                    userId: referrerId,
                    type: "direct_commission",
                    amount: commission,
                    balanceAfter: wallet.balance,
                    relatedPurchaseId: purchase._id,
                    note: `Direct commission from purchase`,
                });
            }
            yield model_3.User.findByIdAndUpdate(referrerId, { $inc: { directSalesCount: purchase.quantity } });
            yield (0, controller_1.recalcUserRank)(referrerId.toString());
        }
        // ── ২. ম্যানেজারিয়াল কমিশন + ৩. Side ভলিউম আপডেট ──────────────────────
        let currentId = placementParentId === null || placementParentId === void 0 ? void 0 : placementParentId.toString();
        // managerial commission pool: share-এর নির্ধারিত % থেকে মোট পরিমাণ
        const managerialBase = purchase.paymentType === "cash"
            ? share.cashPrice * purchase.quantity
            : share.installment.downPayment * purchase.quantity;
        const managerialPool = (purchase.paymentType === "cash"
            ? share.managerialCommissionForCashSell
            : share.managerialCommissionForInstallmentSell) / 100 * managerialBase;
        for (let gen = 1; gen <= maxGen && currentId; gen++) {
            // এই জেনারেশনের জন্য কনফিগার করা রেট খোঁজো
            const genConfig = genRates.find((g) => g.generation === gen);
            if (genConfig && genConfig.rate > 0) {
                // pool থেকে এই জেনারেশনের % নেওয়া হচ্ছে
                const commission = (genConfig.rate / 100) * managerialPool;
                // pendingManagerialCommissionBalance-এ জমা হয় — সরাসরি উইথড্র করা যায় না
                const wallet = yield model_2.Wallet.findOne({ userId: currentId });
                if (!wallet)
                    continue;
                const before = wallet.pendingManagerialCommissionBalance;
                wallet.pendingManagerialCommissionBalance += commission;
                yield wallet.save();
                const currentUser = yield model_3.User.findById(currentId).select("name username");
                const currentLabel = currentUser ? `${currentUser.name} (${currentUser.username})` : currentId;
                debugEntries.push({ userId: wallet.userId, role: "managerial_gen", generation: gen, field: "pendingManagerialCommissionBalance", before, added: commission, after: wallet.pendingManagerialCommissionBalance, description: `ম্যানেজারিয়াল কমিশন (জেনারেশন ${gen}, ${genConfig.rate}% of pool ৳${managerialPool}): purchase #${purchase._id} থেকে ${currentLabel}-এর pendingManagerialCommissionBalance-এ ৳${commission} যোগ হয়েছে। আগে ছিল ৳${before}, এখন ৳${wallet.pendingManagerialCommissionBalance}।` });
                yield model_2.TransactionLog.create({
                    userId: currentId,
                    type: "managerial_commission",
                    amount: commission,
                    balanceAfter: wallet.balance,
                    relatedPurchaseId: purchase._id,
                    note: `Gen ${gen} commission from pool ${managerialPool}`,
                });
            }
            // র্যাংক হিসাবের জন্য এই ancestor-এর টিম সেলস কাউন্ট বাড়ানো হচ্ছে
            yield model_3.User.findByIdAndUpdate(currentId, { $inc: { teamSalesCount: purchase.quantity } });
            yield (0, controller_1.recalcUserRank)(currentId);
            // পরবর্তী জেনারেশনের জন্য আরও উপরে উঠো — placementAncestors[0] থেকে derive করো
            const ancestor = yield model_3.User.findById(currentId).select("placementAncestors name username");
            const level1 = (_g = ancestor === null || ancestor === void 0 ? void 0 : ancestor.placementAncestors) === null || _g === void 0 ? void 0 : _g[0];
            currentId = (_h = level1 === null || level1 === void 0 ? void 0 : level1.userId) === null || _h === void 0 ? void 0 : _h.toString();
        }
        // দ্বিতীয়বার কমিশন যাওয়া ঠেকাতে flag সেট করো
        purchase.commissionProcessed = true;
        yield purchase.save();
        yield commissionDebug_model_1.CommissionDebug.create({
            purchaseId: purchase._id,
            buyerId: purchase.userId,
            buyerName: buyer.name,
            buyerUsername: buyer.username,
            shareTitle: (_j = share.title) !== null && _j !== void 0 ? _j : "",
            paymentType: purchase.paymentType,
            approvedAmount: managerialBase,
            entries: debugEntries,
        });
    }
    catch (err) {
        console.error("Commission distribution error:", err);
    }
});
exports.distributeCommissions = distributeCommissions;
