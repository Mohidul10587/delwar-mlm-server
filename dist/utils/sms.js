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
exports.sendOtpSms = sendOtpSms;
exports.sendRegistrationSms = sendRegistrationSms;
exports.sendPurchaseApprovalSms = sendPurchaseApprovalSms;
exports.sendInstallmentApprovalSms = sendInstallmentApprovalSms;
exports.sendWithdrawalApprovalSms = sendWithdrawalApprovalSms;
exports.sendRegistrationConfirmationSms = sendRegistrationConfirmationSms;
const MIMSMS_BASE = "https://api.mimsms.com";
const USERNAME = process.env.MIMSMS_USERNAME;
const APIKEY = process.env.MIMSMS_APIKEY;
const SENDER = process.env.MIMSMS_SENDER || "8809617611003";
/**
 * Generic SMS sending function
 */
function sendSms(phone, message) {
    return __awaiter(this, void 0, void 0, function* () {
        const mobile = phone.startsWith("88") ? phone : `88${phone}`;
        const body = {
            UserName: USERNAME,
            Apikey: APIKEY,
            MobileNumber: mobile,
            CampaignId: "null",
            SenderName: SENDER,
            TransactionType: "T",
            Message: message,
        };
        const res = yield fetch(`${MIMSMS_BASE}/api/SmsSending/SMS`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        const data = yield res.json();
        if (data.statusCode !== "200") {
            throw new Error(`SMS failed: ${data.responseResult}`);
        }
    });
}
/**
 * Send OTP SMS for verification
 */
function sendOtpSms(phone, otp) {
    return __awaiter(this, void 0, void 0, function* () {
        const message = `Your OTP is: ${otp}. Valid for 5 minutes. Alahee Group.`;
        yield sendSms(phone, message);
    });
}
/**
 * Send registration credentials SMS
 */
function sendRegistrationSms(phone, username, password) {
    return __awaiter(this, void 0, void 0, function* () {
        const message = `Welcome to Alahee Group! Your account has been created. Username: ${username}, Password: ${password}. Please login and change your password. Alahee Group.`;
        yield sendSms(phone, message);
    });
}
/**
 * Send purchase approval SMS
 */
function sendPurchaseApprovalSms(phone, purchaseId, amount, productName) {
    return __awaiter(this, void 0, void 0, function* () {
        const message = `Your purchase (ID: ${purchaseId}) of ${productName} for ৳${amount.toLocaleString()} has been approved. Thank you! Alahee Group.`;
        yield sendSms(phone, message);
    });
}
/**
 * Send installment payment approval SMS
 */
function sendInstallmentApprovalSms(phone, amount, purchaseId) {
    return __awaiter(this, void 0, void 0, function* () {
        const message = `Your installment payment of ৳${amount.toLocaleString()} for purchase ${purchaseId} has been approved. Thank you! Alahee Group.`;
        yield sendSms(phone, message);
    });
}
/**
 * Send withdrawal approval SMS
 */
function sendWithdrawalApprovalSms(phone, amount, taxAmount, netAmount, method) {
    return __awaiter(this, void 0, void 0, function* () {
        const message = `Your withdrawal request of ৳${amount.toLocaleString()} has been approved. Tax: ৳${taxAmount.toLocaleString()}, Net Amount: ৳${netAmount.toLocaleString()} via ${method}. Alahee Group.`;
        yield sendSms(phone, message);
    });
}
/**
 * Send registration confirmation SMS (when password is not available)
 */
function sendRegistrationConfirmationSms(phone, username) {
    return __awaiter(this, void 0, void 0, function* () {
        const message = `Welcome to Alahee Group! Your account @${username} has been verified successfully. Please login with your registered credentials. Alahee Group.`;
        yield sendSms(phone, message);
    });
}
