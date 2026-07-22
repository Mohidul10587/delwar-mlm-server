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
const MIMSMS_BASE = "https://api.mimsms.com";
const USERNAME = process.env.MIMSMS_USERNAME;
const APIKEY = process.env.MIMSMS_APIKEY;
const SENDER = process.env.MIMSMS_SENDER || "8809617611003";
function sendOtpSms(phone, otp) {
    return __awaiter(this, void 0, void 0, function* () {
        const mobile = phone.startsWith("88") ? phone : `88${phone}`;
        const body = {
            UserName: USERNAME,
            Apikey: APIKEY,
            MobileNumber: mobile,
            CampaignId: "null",
            SenderName: SENDER,
            TransactionType: "T",
            Message: `Your OTP is: ${otp}. Valid for 5 minutes.`,
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
