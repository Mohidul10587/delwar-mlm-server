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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
class OTPService {
    generateOTP() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    getOTPExpiry() {
        return new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    }
    sendOTP(phone, otp) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const message = `Your verification code is: ${otp}. Valid for 5 minutes. Do not share this code.`;
                return yield this.sendSMS(phone, message);
            }
            catch (error) {
                console.error("OTP sending failed:", error);
                return false;
            }
        });
    }
    sendSMS(phone, message) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!process.env.SMS_API_KEY || !process.env.SMS_USERNAME) {
                return true;
            }
            try {
                const response = yield axios_1.default.post(`${process.env.SMS_BASE_URL}/api/SmsSending/SMS`, {
                    UserName: process.env.SMS_USERNAME,
                    Apikey: process.env.SMS_API_KEY,
                    MobileNumber: phone.startsWith("88") ? phone : `88${phone}`,
                    CampaignId: "null",
                    SenderName: process.env.SMS_SENDER || "BOOKSHOP",
                    TransactionType: "T",
                    Message: message,
                }, {
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                });
                return (response.data.statusCode === "200" && response.data.status === "Success");
            }
            catch (error) {
                console.error("MIM SMS API error:", error);
                return false;
            }
        });
    }
    isOTPValid(otp, storedOTP, expiry) {
        return otp === storedOTP && new Date() < expiry;
    }
}
exports.default = new OTPService();
