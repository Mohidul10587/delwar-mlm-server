import { Router, Request, Response, NextFunction } from "express";
import { Otp } from "./model";
import { User } from "../user/model";
import { sendOtpSms } from "../../utils/sms";
import {
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  cookieOpts,
} from "../../utils/authConfig";
import jwt from "jsonwebtoken";

const router = Router();

/**
 * POST /otp/send
 * OTP তৈরি করে SMS পাঠায়
 * Body: { username: string, purpose: "register" | "forgot-password" }
 */
router.post(
  "/send",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, purpose } = req.body as {
        username: string;
        purpose: "register" | "forgot-password";
      };

      if (!username || !purpose) {
        return res.status(400).json({
          message: {
            en: "Username and purpose required",
            bn: "ইউজারনেম ও উদ্দেশ্য প্রয়োজন",
          },
        });
      }

      // User আছে কিনা check
      const user = await User.findOne({ username }).select("phone");
      if (!user) {
        return res.status(404).json({
          message: { en: "User not found", bn: "ইউজার পাওয়া যায়নি" },
        });
      }

      // ৬ digit random OTP তৈরি
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // পুরনো OTP মুছে ফেলা (same username + purpose)
      await Otp.deleteMany({ username, purpose });

      // নতুন OTP save
      await Otp.create({ username, code, purpose, expiresAt });

      // SMS পাঠানো
      await sendOtpSms(user.phone, code);

      res.json({ message: { en: "OTP sent", bn: "OTP পাঠানো হয়েছে" } });
    } catch (err) {
      next(err);
    }
  }
);

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
router.post(
  "/verify",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, code, purpose } = req.body as {
        username: string;
        code: string;
        purpose: "register" | "forgot-password";
      };

      if (!username || !code || !purpose) {
        return res.status(400).json({
          message: {
            en: "Username, code and purpose required",
            bn: "ইউজারনেম, কোড ও উদ্দেশ্য প্রয়োজন",
          },
        });
      }

      // OTP খুঁজে বের করা
      const otp = await Otp.findOne({
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
      await otp.deleteOne();

      // purpose অনুযায়ী action
      if (purpose === "register") {
        // User এর phone verify করা
        const user = await User.findOneAndUpdate(
          { username },
          { isPhoneVerified: true },
          { new: true }
        );

        if (!user) {
          return res.status(404).json({
            message: { en: "User not found", bn: "ইউজার পাওয়া যায়নি" },
          });
        }

        // Auto-login: token generate + cookie set
        const accessToken = jwt.sign({ id: user._id.toString() }, JWT_SECRET, {
          expiresIn: "30m",
        });
        const refreshToken = jwt.sign(
          { id: user._id.toString() },
          JWT_REFRESH_SECRET,
          { expiresIn: "1d" }
        );

        const opts = cookieOpts();
        res.cookie("accessToken", accessToken, opts);
        res.cookie("refreshToken", refreshToken, opts);

        return res.json({
          message: { en: "Phone verified", bn: "ফোন যাচাই সফল" },
          user,
        });
      }

      // purpose === "forgot-password"
      res.json({ message: { en: "OTP verified", bn: "OTP যাচাই সফল" } });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
