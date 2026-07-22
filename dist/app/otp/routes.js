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
const express_1 = require("express");
const model_1 = require("./model");
const model_2 = require("../user/model");
const sms_1 = require("../../utils/sms");
const authConfig_1 = require("../../utils/authConfig");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const router = (0, express_1.Router)();
/**
 * POST /otp/send
 * OTP তৈরি করে SMS পাঠায়
 * Body: { username: string, purpose: "register" | "forgot-password" }
 */
router.post("/send", (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username, purpose } = req.body;
        if (!username || !purpose) {
            return res.status(400).json({
                message: {
                    en: "Username and purpose required",
                    bn: "ইউজারনেম ও উদ্দেশ্য প্রয়োজন",
                },
            });
        }
        // User আছে কিনা check
        const user = yield model_2.User.findOne({ username }).select("phone");
        if (!user) {
            return res.status(404).json({
                message: { en: "User not found", bn: "ইউজার পাওয়া যায়নি" },
            });
        }
        // ৬ digit random OTP তৈরি
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
        // পুরনো OTP মুছে ফেলা (same username + purpose)
        yield model_1.Otp.deleteMany({ username, purpose });
        // নতুন OTP save
        yield model_1.Otp.create({ username, code, purpose, expiresAt });
        // SMS পাঠানো
        yield (0, sms_1.sendOtpSms)(user.phone, code);
        res.json({ message: { en: "OTP sent", bn: "OTP পাঠানো হয়েছে" } });
    }
    catch (err) {
        next(err);
    }
}));
/**
 * POST /otp/verify
 * OTP যাচাই করে
 * Body: { username: string, code: string, purpose: "register" | "forgot-password" }
 *
 * purpose === "register" হলে:
 *  - User এর isPhoneVerified = true করে
 *  - access/refresh token cookie set করে
 *  - user object রিটার্ন করে (auto-login)
 *
 * purpose === "forgot-password" হলে:
 *  - শুধু OTP verified message দেয়
 *  - Frontend পরবর্তী ধাপে password reset করবে
 */
router.post("/verify", (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username, code, purpose } = req.body;
        if (!username || !code || !purpose) {
            return res.status(400).json({
                message: {
                    en: "Username, code and purpose required",
                    bn: "ইউজারনেম, কোড ও উদ্দেশ্য প্রয়োজন",
                },
            });
        }
        // OTP খুঁজে বের করা
        const otp = yield model_1.Otp.findOne({
            username,
            purpose,
            code,
            expiresAt: { $gt: new Date() },
        });
        if (!otp) {
            return res.status(400).json({
                message: {
                    en: "Invalid or expired OTP",
                    bn: "OTP ভুল বা মেয়াদ শেষ",
                },
            });
        }
        // OTP মুছে ফেলা (একবার use হলে আর valid নয়)
        yield otp.deleteOne();
        // purpose অনুযায়ী action
        if (purpose === "register") {
            // User এর phone verify করা
            const user = yield model_2.User.findOneAndUpdate({ username }, { isPhoneVerified: true }, { new: true });
            if (!user) {
                return res.status(404).json({
                    message: { en: "User not found", bn: "ইউজার পাওয়া যায়নি" },
                });
            }
            // Auto-login: token generate + cookie set
            const accessToken = jsonwebtoken_1.default.sign({ id: user._id.toString() }, authConfig_1.JWT_SECRET, {
                expiresIn: "30m",
            });
            const refreshToken = jsonwebtoken_1.default.sign({ id: user._id.toString() }, authConfig_1.JWT_REFRESH_SECRET, { expiresIn: "1d" });
            const opts = (0, authConfig_1.cookieOpts)();
            res.cookie("accessToken", accessToken, opts);
            res.cookie("refreshToken", refreshToken, opts);
            return res.json({
                message: { en: "Phone verified", bn: "ফোন যাচাই সফল" },
                user,
            });
        }
        // purpose === "forgot-password"
        res.json({ message: { en: "OTP verified", bn: "OTP যাচাই সফল" } });
    }
    catch (err) {
        next(err);
    }
}));
exports.default = router;
