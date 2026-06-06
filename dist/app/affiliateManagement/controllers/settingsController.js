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
exports.updateSettings = exports.getSettings = void 0;
const AffiliateSettings_1 = require("../models/AffiliateSettings");
// Get affiliate settings
const getSettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let settings = yield AffiliateSettings_1.AffiliateSettings.findOne();
        if (!settings) {
            settings = new AffiliateSettings_1.AffiliateSettings();
            yield settings.save();
        }
        res.json({
            success: true,
            data: settings
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});
exports.getSettings = getSettings;
// Update affiliate settings
const updateSettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { commissionRate, maxCommissionLimit, minWithdrawalAmount, autoApprovalEnabled, autoApprovalThreshold, isSystemActive } = req.body;
        let settings = yield AffiliateSettings_1.AffiliateSettings.findOne();
        if (!settings) {
            settings = new AffiliateSettings_1.AffiliateSettings();
        }
        if (commissionRate !== undefined)
            settings.commissionRate = commissionRate;
        if (maxCommissionLimit !== undefined)
            settings.maxCommissionLimit = maxCommissionLimit;
        if (minWithdrawalAmount !== undefined)
            settings.minWithdrawalAmount = minWithdrawalAmount;
        if (autoApprovalEnabled !== undefined)
            settings.autoApprovalEnabled = autoApprovalEnabled;
        if (autoApprovalThreshold !== undefined)
            settings.autoApprovalThreshold = autoApprovalThreshold;
        if (isSystemActive !== undefined)
            settings.isSystemActive = isSystemActive;
        yield settings.save();
        res.json({
            success: true,
            message: "Settings updated successfully",
            data: settings
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});
exports.updateSettings = updateSettings;
