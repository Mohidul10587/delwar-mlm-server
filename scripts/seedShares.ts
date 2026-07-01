/**
 * Seed script — populates the Share collection with varied sample data
 * including many different offer types.
 * Run: npx ts-node scripts/seedShares.ts
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import { Share } from "../src/app/share/model";

dotenv.config();

const now = new Date();
const daysFromNow = (d: number) => new Date(now.getTime() + d * 86_400_000);

const shares = [
  // ── Running — no offer ───────────────────────────────────────────────────

  {
    title: "Skyline Residency — Tower A",
    image: "/placeholder.jpg",
    images: [],
    cashPrice: 850000,
    minDownPayment: 85000,
    maxDownPayment: 250000,
    minInstallments: 12,
    maxInstallments: 60,
    directSaleCommissionValue: 5000,
    downPaymentGenerationRates: [
      { generation: 1, rate: 5 },
      { generation: 2, rate: 3 },
      { generation: 3, rate: 1 },
    ],
    installmentCommissionRate: 2,
    totalShares: 120,
    isActive: true,
    projectType: "Residential Apartment",
    location: "Dhaka, Mirpur-10",
    developer: "Skyline Properties Ltd.",
    projectStatus: "running",
    isOffer: false,
    offerText: null,
    offerStartDate: null,
    offerEndDate: null,
    offerPriority: 0,
  },

  {
    title: "Green Valley Commercial Plaza",
    image: "/placeholder.jpg",
    images: [],
    cashPrice: 1200000,
    minDownPayment: 150000,
    maxDownPayment: 400000,
    minInstallments: 12,
    maxInstallments: 48,
    directSaleCommissionValue: 8000,
    downPaymentGenerationRates: [
      { generation: 1, rate: 6 },
      { generation: 2, rate: 4 },
      { generation: 3, rate: 2 },
    ],
    installmentCommissionRate: 2.5,
    totalShares: 80,
    isActive: true,
    projectType: "Commercial Space",
    location: "Dhaka, Gulshan-2",
    developer: "Green Valley Developers",
    projectStatus: "running",
    isOffer: false,
    offerText: null,
    offerStartDate: null,
    offerEndDate: null,
    offerPriority: 0,
  },

  // ── Offer type 1 — Percentage discount ───────────────────────────────────

  {
    title: "Sunrise Township — Phase 2",
    image: "/placeholder.jpg",
    images: [],
    cashPrice: 650000,
    minDownPayment: 65000,
    maxDownPayment: 200000,
    minInstallments: 10,
    maxInstallments: 60,
    directSaleCommissionValue: 4000,
    downPaymentGenerationRates: [
      { generation: 1, rate: 5 },
      { generation: 2, rate: 3 },
    ],
    installmentCommissionRate: 1.5,
    totalShares: 200,
    isActive: true,
    projectType: "Residential Apartment",
    location: "Chattogram, Nasirabad",
    developer: "Sunrise Builders Co.",
    projectStatus: "running",
    // offer type: percentage discount on down payment
    isOffer: true,
    offerText: "10% OFF on down payment",
    offerStartDate: daysFromNow(-3),
    offerEndDate:   daysFromNow(10),
    offerPriority: 2,
  },

  // ── Offer type 2 — Free gift / perk ──────────────────────────────────────

  {
    title: "Horizon Heights — Studio Units",
    image: "/placeholder.jpg",
    images: [],
    cashPrice: 420000,
    minDownPayment: 42000,
    maxDownPayment: 120000,
    minInstallments: 6,
    maxInstallments: 36,
    directSaleCommissionValue: 2500,
    downPaymentGenerationRates: [
      { generation: 1, rate: 4 },
      { generation: 2, rate: 2 },
    ],
    installmentCommissionRate: 1,
    totalShares: 300,
    isActive: true,
    projectType: "Studio Apartment",
    location: "Dhaka, Bashundhara R/A",
    developer: "Horizon Real Estate",
    projectStatus: "running",
    // offer type: free gift/perk
    isOffer: true,
    offerText: "Free car parking worth ৳50,000",
    offerStartDate: daysFromNow(-1),
    offerEndDate:   daysFromNow(7),
    offerPriority: 1,
  },

  // ── Offer type 3 — Flat amount off ───────────────────────────────────────

  {
    title: "EcoCity Smart Homes",
    image: "/placeholder.jpg",
    images: [],
    cashPrice: 950000,
    minDownPayment: 95000,
    maxDownPayment: 300000,
    minInstallments: 12,
    maxInstallments: 60,
    directSaleCommissionValue: 6000,
    downPaymentGenerationRates: [
      { generation: 1, rate: 5 },
      { generation: 2, rate: 3 },
    ],
    installmentCommissionRate: 2,
    totalShares: 150,
    isActive: true,
    projectType: "Smart Home",
    location: "Dhaka, Purbachal",
    developer: "EcoCity Developers Ltd.",
    projectStatus: "upcoming",
    // offer type: flat amount discount
    isOffer: true,
    offerText: "৳20,000 off — first 30 bookings only",
    offerStartDate: daysFromNow(0),
    offerEndDate:   daysFromNow(30),
    offerPriority: 3,
  },

  // ── Offer type 4 — Zero installment / easy payment ───────────────────────

  {
    title: "Lakeside Residences — Block C",
    image: "/placeholder.jpg",
    images: [],
    cashPrice: 780000,
    minDownPayment: 78000,
    maxDownPayment: 230000,
    minInstallments: 6,
    maxInstallments: 60,
    directSaleCommissionValue: 4500,
    downPaymentGenerationRates: [
      { generation: 1, rate: 5 },
      { generation: 2, rate: 3 },
      { generation: 3, rate: 1 },
    ],
    installmentCommissionRate: 2,
    totalShares: 90,
    isActive: true,
    projectType: "Residential Apartment",
    location: "Dhaka, Rampura",
    developer: "Lakeside Builders",
    projectStatus: "running",
    // offer type: 0% installment / easy EMI
    isOffer: true,
    offerText: "0% interest — easy 60-month installment",
    offerStartDate: daysFromNow(-5),
    offerEndDate:   daysFromNow(20),
    offerPriority: 4,
  },

  // ── Offer type 5 — Seasonal / festival offer ──────────────────────────────

  {
    title: "Heritage Corners — Premium Plots",
    image: "/placeholder.jpg",
    images: [],
    cashPrice: 2200000,
    minDownPayment: 250000,
    maxDownPayment: 700000,
    minInstallments: 24,
    maxInstallments: 72,
    directSaleCommissionValue: 14000,
    downPaymentGenerationRates: [
      { generation: 1, rate: 7 },
      { generation: 2, rate: 5 },
      { generation: 3, rate: 2 },
    ],
    installmentCommissionRate: 3,
    totalShares: 60,
    isActive: true,
    projectType: "Residential Plot",
    location: "Gazipur, Tongi",
    developer: "Heritage Land Developers",
    projectStatus: "running",
    // offer type: seasonal / Eid festival
    isOffer: true,
    offerText: "Eid Special — ৳50,000 cash rebate on booking",
    offerStartDate: daysFromNow(-2),
    offerEndDate:   daysFromNow(5),
    offerPriority: 5,
  },

  // ── Offer type 6 — Limited-slot flash sale ────────────────────────────────

  {
    title: "Cityscape Tower — Floor 12–15",
    image: "/placeholder.jpg",
    images: [],
    cashPrice: 1600000,
    minDownPayment: 180000,
    maxDownPayment: 500000,
    minInstallments: 18,
    maxInstallments: 60,
    directSaleCommissionValue: 10000,
    downPaymentGenerationRates: [
      { generation: 1, rate: 6 },
      { generation: 2, rate: 4 },
      { generation: 3, rate: 2 },
    ],
    installmentCommissionRate: 2.5,
    totalShares: 40,
    isActive: true,
    projectType: "High-Rise Apartment",
    location: "Dhaka, Tejgaon",
    developer: "Cityscape Realty",
    projectStatus: "running",
    // offer type: flash sale — very short window
    isOffer: true,
    offerText: "Flash Sale — only 10 units at this price!",
    offerStartDate: daysFromNow(0),
    offerEndDate:   daysFromNow(2),
    offerPriority: 6,
  },

  // ── Offer type 7 — Referral bonus offer ──────────────────────────────────

  {
    title: "Greenwood Family Homes",
    image: "/placeholder.jpg",
    images: [],
    cashPrice: 1100000,
    minDownPayment: 110000,
    maxDownPayment: 350000,
    minInstallments: 12,
    maxInstallments: 60,
    directSaleCommissionValue: 7000,
    downPaymentGenerationRates: [
      { generation: 1, rate: 6 },
      { generation: 2, rate: 4 },
    ],
    installmentCommissionRate: 2,
    totalShares: 110,
    isActive: true,
    projectType: "Family Apartment",
    location: "Dhaka, Uttara Sector-7",
    developer: "Greenwood Housing Ltd.",
    projectStatus: "upcoming",
    // offer type: referral/bonus offer
    isOffer: true,
    offerText: "Refer a friend — both get ৳10,000 bonus",
    offerStartDate: daysFromNow(-7),
    offerEndDate:   daysFromNow(14),
    offerPriority: 2,
  },

  // ── Offer type 8 — Expired offer (inactive) ───────────────────────────────

  {
    title: "Palms View Duplex",
    image: "/placeholder.jpg",
    images: [],
    cashPrice: 1800000,
    minDownPayment: 200000,
    maxDownPayment: 600000,
    minInstallments: 24,
    maxInstallments: 72,
    directSaleCommissionValue: 12000,
    downPaymentGenerationRates: [
      { generation: 1, rate: 7 },
      { generation: 2, rate: 5 },
      { generation: 3, rate: 2 },
    ],
    installmentCommissionRate: 3,
    totalShares: 50,
    isActive: true,
    projectType: "Duplex",
    location: "Sylhet, Shahjalal Uposhahor",
    developer: "Palms Development Ltd.",
    projectStatus: "running",
    // offer type: expired — should NOT show in Special Offers section
    isOffer: true,
    offerText: "New Year Special — 15% off (expired)",
    offerStartDate: daysFromNow(-30),
    offerEndDate:   daysFromNow(-5),
    offerPriority: 0,
  },

  // ── Upcoming — no offer ───────────────────────────────────────────────────

  {
    title: "Marina Bay Condominiums",
    image: "/placeholder.jpg",
    images: [],
    cashPrice: 2500000,
    minDownPayment: 300000,
    maxDownPayment: 800000,
    minInstallments: 24,
    maxInstallments: 84,
    directSaleCommissionValue: 15000,
    downPaymentGenerationRates: [
      { generation: 1, rate: 8 },
      { generation: 2, rate: 5 },
      { generation: 3, rate: 3 },
    ],
    installmentCommissionRate: 3.5,
    totalShares: 40,
    isActive: true,
    projectType: "Luxury Condominium",
    location: "Cox's Bazar, Marine Drive",
    developer: "Marina Bay Group",
    projectStatus: "upcoming",
    isOffer: false,
    offerText: null,
    offerStartDate: null,
    offerEndDate: null,
    offerPriority: 0,
  },

  // ── Completed — no offer ──────────────────────────────────────────────────

  {
    title: "Heritage Towers — Block B",
    image: "/placeholder.jpg",
    images: [],
    cashPrice: 700000,
    minDownPayment: 70000,
    maxDownPayment: 200000,
    minInstallments: 10,
    maxInstallments: 48,
    directSaleCommissionValue: 4500,
    downPaymentGenerationRates: [
      { generation: 1, rate: 5 },
      { generation: 2, rate: 3 },
    ],
    installmentCommissionRate: 2,
    totalShares: 100,
    isActive: false,
    projectType: "Residential Apartment",
    location: "Dhaka, Dhanmondi",
    developer: "Heritage Builders",
    projectStatus: "complete",
    isOffer: false,
    offerText: null,
    offerStartDate: null,
    offerEndDate: null,
    offerPriority: 0,
  },

  {
    title: "River Breeze Villas",
    image: "/placeholder.jpg",
    images: [],
    cashPrice: 3500000,
    minDownPayment: 500000,
    maxDownPayment: 1200000,
    minInstallments: 36,
    maxInstallments: 84,
    directSaleCommissionValue: 20000,
    downPaymentGenerationRates: [
      { generation: 1, rate: 8 },
      { generation: 2, rate: 5 },
      { generation: 3, rate: 3 },
      { generation: 4, rate: 1 },
    ],
    installmentCommissionRate: 4,
    totalShares: 30,
    isActive: false,
    projectType: "Villa",
    location: "Narayanganj, Sonargaon",
    developer: "River Breeze Estates",
    projectStatus: "complete",
    isOffer: false,
    offerText: null,
    offerStartDate: null,
    offerEndDate: null,
    offerPriority: 0,
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log("Connected to MongoDB");

  const existing = await Share.countDocuments();
  if (existing > 0) {
    await Share.deleteMany({});
    console.log(`🗑  Cleared ${existing} existing share(s).`);
  }

  const inserted = await Share.insertMany(shares);
  console.log(`✅ Seeded ${inserted.length} shares.\n`);

  console.table(
    inserted.map((s) => {
      const active =
        s.isOffer &&
        (!s.offerStartDate || s.offerStartDate <= new Date()) &&
        (!s.offerEndDate   || s.offerEndDate   >= new Date());
      return {
        title:      s.title.padEnd(40),
        status:     s.projectStatus,
        isActive:   s.isActive,
        offer:      s.isOffer ? (active ? "✅ active" : "❌ expired") : "—",
        offerText:  s.offerText ?? "",
        priority:   s.offerPriority,
      };
    })
  );

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
