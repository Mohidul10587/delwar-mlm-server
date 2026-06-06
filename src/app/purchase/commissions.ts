import { Purchase } from "./model";
import { CommissionDebug, ICommissionDebugEntry } from "./commissionDebug.model";
import { Wallet, TransactionLog } from "../wallet/model";
import { User } from "../user/model";
import { Settings } from "../settings/model";
import { recalcUserRank } from "../rank/controller";

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
export const distributeCommissions = async (purchaseId: string) => {
  try {
    // purchase ও তার share তথ্য একসাথে লোড করা হচ্ছে
    const purchase = await Purchase.findById(purchaseId).populate("shareId");

    // যদি purchase না পাওয়া যায় অথবা আগেই কমিশন দেওয়া হয়ে থাকে, তাহলে বন্ধ করো
    if (!purchase || purchase.commissionProcessed) return;

    const share = purchase.shareId as any;

    // ক্রেতার referrer ও placementParent জানার জন্য buyer লোড করা হচ্ছে
    const buyer = await User.findById(purchase.userId).select("generationAncestors placementAncestors name username");
    if (!buyer) return;

    // ancestor arrays থেকে direct parent/referrer derive করা হচ্ছে
    const referrerId = buyer.generationAncestors[0]?.userId ?? null;
    const placementParentId = buyer.placementAncestors[0]?.userId ?? null;
    const buyerPlacementSide = (buyer.placementAncestors[0] as any)?.side as "A" | "B" | null | undefined;

    // সিস্টেম সেটিংস থেকে সর্বোচ্চ জেনারেশন সংখ্যা ও প্রতিটি জেনারেশনের রেট নেওয়া হচ্ছে
    const settings = await Settings.findOne();
    const maxGen = settings?.maxGenerations ?? 5;
    const genRates = settings?.generationCommission ?? [];

    const debugEntries: ICommissionDebugEntry[] = [];

    // ── ১. ডাইরেক্ট সেলস কমিশন ──────────────────────────────────────────────
    if (referrerId) {
      const referrer = await User.findById(referrerId).select("name username");
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
        const wallet = await Wallet.findOne({ userId: referrerId });
        if (!wallet) return;
        const before = wallet.balance;
        wallet.balance += commission;
        await wallet.save();

        debugEntries.push({ userId: referrerId, role: "referrer_direct", field: "balance", before, added: commission, after: wallet.balance, description: `ডাইরেক্ট সেলস কমিশন (${rate}%): purchase #${purchase._id} থেকে referrer ${referrerLabel}-এর balance-এ ৳${commission} যোগ হয়েছে। আগে ছিল ৳${before}, এখন ৳${wallet.balance}।` });

        await TransactionLog.create({
          userId: referrerId,
          type: "direct_commission",
          amount: commission,
          balanceAfter: wallet.balance,
          relatedPurchaseId: purchase._id,
          note: `Direct commission from purchase`,
        });
      }

      await User.findByIdAndUpdate(referrerId, { $inc: { directSalesCount: purchase.quantity } });
      await recalcUserRank(referrerId.toString());
    }

    // ── ২. ম্যানেজারিয়াল কমিশন + ৩. Side ভলিউম আপডেট ──────────────────────
    let currentId = placementParentId?.toString();
    let childSide = buyerPlacementSide;

    // managerial commission pool: share-এর নির্ধারিত % থেকে মোট পরিমাণ
    const managerialBase = purchase.paymentType === "cash"
      ? share.cashPrice * purchase.quantity
      : share.installment.downPayment * purchase.quantity;

    const managerialPool = (
      purchase.paymentType === "cash"
        ? share.managerialCommissionForCashSell
        : share.managerialCommissionForInstallmentSell
    ) / 100 * managerialBase;

    for (let gen = 1; gen <= maxGen && currentId; gen++) {
      // এই জেনারেশনের জন্য কনফিগার করা রেট খোঁজো
      const genConfig = genRates.find((g: any) => g.generation === gen);

      if (genConfig && genConfig.rate > 0) {
        // pool থেকে এই জেনারেশনের % নেওয়া হচ্ছে
        const commission = (genConfig.rate / 100) * managerialPool;

        // pendingManagerialCommissionBalance-এ জমা হয় — সরাসরি উইথড্র করা যায় না
        const wallet = await Wallet.findOne({ userId: currentId });
        if (!wallet) continue;
        const before = wallet.pendingManagerialCommissionBalance;
        wallet.pendingManagerialCommissionBalance += commission;
        await wallet.save();

        const currentUser = await User.findById(currentId).select("name username");
        const currentLabel = currentUser ? `${currentUser.name} (${currentUser.username})` : currentId;

        debugEntries.push({ userId: wallet.userId, role: "managerial_gen", generation: gen, field: "pendingManagerialCommissionBalance", before, added: commission, after: wallet.pendingManagerialCommissionBalance, description: `ম্যানেজারিয়াল কমিশন (জেনারেশন ${gen}, ${genConfig.rate}% of pool ৳${managerialPool}): purchase #${purchase._id} থেকে ${currentLabel}-এর pendingManagerialCommissionBalance-এ ৳${commission} যোগ হয়েছে। আগে ছিল ৳${before}, এখন ৳${wallet.pendingManagerialCommissionBalance}।` });

        await TransactionLog.create({
          userId: currentId,
          type: "managerial_commission",
          amount: commission,
          balanceAfter: wallet.balance,
          relatedPurchaseId: purchase._id,
          note: `Gen ${gen} commission from pool ${managerialPool}`,
        });
      }

    // র্যাংক হিসাবের জন্য এই ancestor-এর টিম সেলস কাউন্ট বাড়ানো হচ্ছে
      await User.findByIdAndUpdate(currentId, { $inc: { teamSalesCount: purchase.quantity } });
      await recalcUserRank(currentId);

      // পরবর্তী জেনারেশনের জন্য আরও উপরে উঠো — placementAncestors[0] থেকে derive করো
      const ancestor = await User.findById(currentId).select("placementAncestors name username");
      const level1 = (ancestor as any)?.placementAncestors?.[0];
      childSide = level1?.side as "A" | "B" | null | undefined;
      currentId = level1?.userId?.toString();
    }

    // দ্বিতীয়বার কমিশন যাওয়া ঠেকাতে flag সেট করো
    purchase.commissionProcessed = true;
    await purchase.save();

    await CommissionDebug.create({
      purchaseId: purchase._id,
      buyerId: purchase.userId,
      buyerName: buyer.name,
      buyerUsername: buyer.username,
      shareTitle: share.title ?? "",
      paymentType: purchase.paymentType,
      approvedAmount: managerialBase,
      entries: debugEntries,
    });
  } catch (err) {
    console.error("Commission distribution error:", err);
  }
};
