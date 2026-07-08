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
exports.autoReleaseMonthlySalaries = exports.getMyHistory = exports.getSalaryHistory = exports.releaseSalary = exports.setSalary = exports.getSalaryConfigs = void 0;
const model_1 = require("./model");
const model_2 = require("../wallet/model");
const model_3 = require("../user/model");
const model_4 = require("../ledger/model");
// GET /admin-salary/configs — list all admin salary configurations
const getSalaryConfigs = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const configs = yield model_1.AdminSalaryConfig.find()
            .populate("adminId", "name username phone role")
            .lean();
        res.json({ configs });
    }
    catch (err) {
        next(err);
    }
});
exports.getSalaryConfigs = getSalaryConfigs;
// POST /admin-salary/set — set or update monthly salary for an admin
// Body: { adminId, amount }
const setSalary = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { adminId, amount } = req.body;
        if (!adminId || amount === undefined) {
            return res.status(400).json({ message: "adminId and amount are required" });
        }
        const amt = Number(amount);
        if (isNaN(amt) || amt < 0) {
            return res.status(400).json({ message: "Amount must be >= 0" });
        }
        // Verify the target is actually an admin (not superadmin or user)
        const targetUser = yield model_3.User.findById(adminId).select("role name").lean();
        if (!targetUser)
            return res.status(404).json({ message: "User not found" });
        if (targetUser.role !== "admin") {
            return res.status(400).json({ message: "Salary can only be set for admin role users" });
        }
        const config = yield model_1.AdminSalaryConfig.findOneAndUpdate({ adminId }, { $set: { monthlySalary: amt } }, { new: true, upsert: true });
        res.json({ message: "Salary updated", config });
    }
    catch (err) {
        next(err);
    }
});
exports.setSalary = setSalary;
// POST /admin-salary/release — release monthly salary for an admin
// Body: { adminId, month, note? }
const releaseSalary = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { adminId, month, note } = req.body;
        if (!adminId || !month) {
            return res.status(400).json({ message: "adminId and month are required" });
        }
        // Validate month format YYYY-MM
        if (!/^\d{4}-\d{2}$/.test(month)) {
            return res.status(400).json({ message: "month must be in YYYY-MM format" });
        }
        // Get salary config
        const config = yield model_1.AdminSalaryConfig.findOne({ adminId }).lean();
        if (!config) {
            return res.status(404).json({ message: "No salary configured for this admin. Set salary first." });
        }
        if (config.monthlySalary <= 0) {
            return res.status(400).json({ message: "Salary amount is 0. Update salary before releasing." });
        }
        // Check for duplicate release
        const existing = yield model_1.AdminSalaryRelease.findOne({ adminId, month }).lean();
        if (existing) {
            return res.status(409).json({ message: `Salary for ${month} has already been released for this admin` });
        }
        // Get or create wallet
        let wallet = yield model_2.Wallet.findOne({ userId: adminId });
        if (!wallet) {
            wallet = new model_2.Wallet({ userId: adminId });
        }
        const amount = config.monthlySalary;
        // Update wallet using $inc to avoid race conditions
        yield model_2.Wallet.findOneAndUpdate({ userId: adminId }, {
            $inc: {
                fixedMonthlySalaryForAdminOnly: amount,
                totalBalance: amount,
            },
        }, { upsert: true });
        // Fetch updated wallet for balanceAfter
        const updatedWallet = yield model_2.Wallet.findOne({ userId: adminId }).lean();
        // Create transaction log
        yield model_2.TransactionLog.create({
            userId: adminId,
            type: "admin_monthly_salary",
            amount,
            balanceAfter: (_a = updatedWallet === null || updatedWallet === void 0 ? void 0 : updatedWallet.totalBalance) !== null && _a !== void 0 ? _a : 0,
            note: note ? note.trim() : `Monthly salary for ${month} released by super admin`,
        });
        // Company ledger — outflow
        try {
            yield model_4.CompanyLedger.create({
                date: new Date(),
                type: "salary_paid",
                amount,
                userId: adminId,
                note: `Admin monthly salary released: ${month}${note ? ` — ${note.trim()}` : ""}`,
            });
        }
        catch (ledgerErr) {
            console.error(`[LEDGER ERROR] salary_paid for adminId=${adminId}:`, ledgerErr);
        }
        // Record the release
        const release = yield model_1.AdminSalaryRelease.create({
            adminId,
            amount,
            month,
            releasedBy: req.user._id,
            note: (_b = note === null || note === void 0 ? void 0 : note.trim()) !== null && _b !== void 0 ? _b : "",
        });
        res.json({ message: "Salary released successfully", release });
    }
    catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ message: "Salary for this month has already been released" });
        }
        next(err);
    }
});
exports.releaseSalary = releaseSalary;
// GET /admin-salary/history — full release history (super admin)
const getSalaryHistory = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { adminId, page = "1", limit = "30" } = req.query;
        const filter = {};
        if (adminId)
            filter.adminId = adminId;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [releases, total] = yield Promise.all([
            model_1.AdminSalaryRelease.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate("adminId", "name username phone")
                .populate("releasedBy", "name username")
                .lean(),
            model_1.AdminSalaryRelease.countDocuments(filter),
        ]);
        res.json({ releases, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
    }
    catch (err) {
        next(err);
    }
});
exports.getSalaryHistory = getSalaryHistory;
// GET /admin-salary/my-history — admin sees own salary release history
const getMyHistory = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const adminId = req.user._id;
        const releases = yield model_1.AdminSalaryRelease.find({ adminId })
            .sort({ createdAt: -1 })
            .populate("releasedBy", "name username")
            .lean();
        const config = yield model_1.AdminSalaryConfig.findOne({ adminId }).lean();
        res.json({ releases, monthlySalary: (_a = config === null || config === void 0 ? void 0 : config.monthlySalary) !== null && _a !== void 0 ? _a : 0 });
    }
    catch (err) {
        next(err);
    }
});
exports.getMyHistory = getMyHistory;
// ─── Auto monthly salary release (called by cron job) ────────────────────────
// Runs at end of each month. Releases salary for every admin with monthlySalary > 0.
// Skips admins that have already received salary for the current month.
const autoReleaseMonthlySalaries = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const now = new Date();
    // Format "YYYY-MM" for the month being paid (current month)
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    console.log(`[AUTO SALARY] Starting auto release for month: ${month}`);
    const configs = yield model_1.AdminSalaryConfig.find({ monthlySalary: { $gt: 0 } })
        .populate("adminId", "name username role")
        .lean();
    if (!configs.length) {
        console.log("[AUTO SALARY] No salary configs found. Skipping.");
        return;
    }
    let released = 0;
    let skipped = 0;
    for (const config of configs) {
        const adminId = config.adminId._id;
        // Skip if already released this month
        const existing = yield model_1.AdminSalaryRelease.findOne({ adminId, month }).lean();
        if (existing) {
            skipped++;
            continue;
        }
        const amount = config.monthlySalary;
        try {
            // 1. Credit wallet
            yield model_2.Wallet.findOneAndUpdate({ userId: adminId }, {
                $inc: {
                    fixedMonthlySalaryForAdminOnly: amount,
                    totalBalance: amount,
                },
            }, { upsert: true });
            const updatedWallet = yield model_2.Wallet.findOne({ userId: adminId }).lean();
            // 2. Transaction log
            yield model_2.TransactionLog.create({
                userId: adminId,
                type: "admin_monthly_salary",
                amount,
                balanceAfter: (_a = updatedWallet === null || updatedWallet === void 0 ? void 0 : updatedWallet.totalBalance) !== null && _a !== void 0 ? _a : 0,
                note: `Monthly salary auto-released for ${month}`,
            });
            // 3. Salary release record (prevents duplicate)
            yield model_1.AdminSalaryRelease.create({
                adminId,
                amount,
                month,
                releasedBy: adminId, // system release — self reference as placeholder
                note: `Auto-released for ${month}`,
            });
            // 4. Company ledger — outflow
            try {
                yield model_4.CompanyLedger.create({
                    date: now,
                    type: "salary_paid",
                    amount,
                    userId: adminId,
                    note: `Admin monthly salary auto-released: ${config.adminId.name} (@${config.adminId.username}) — ${month}`,
                });
            }
            catch (ledgerErr) {
                console.error(`[AUTO SALARY] Ledger error for adminId=${adminId}:`, ledgerErr);
            }
            released++;
            console.log(`[AUTO SALARY] Released ৳${amount} to ${config.adminId.username} for ${month}`);
        }
        catch (err) {
            if (err.code === 11000) {
                // Duplicate key — already released, safe to skip
                skipped++;
            }
            else {
                console.error(`[AUTO SALARY] Error releasing for adminId=${adminId}:`, err);
            }
        }
    }
    console.log(`[AUTO SALARY] Done. Released: ${released}, Skipped (already paid): ${skipped}`);
});
exports.autoReleaseMonthlySalaries = autoReleaseMonthlySalaries;
