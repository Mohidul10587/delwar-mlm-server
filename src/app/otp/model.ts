import { Schema, model, Document } from "mongoose";

export interface IOtp extends Document {
  /**
   * username — রেজিস্ট্রেশন ও ফরগট পাসওয়ার্ড উভয় ক্ষেত্রেই username দিয়ে OTP identify করা হয়।
   * একই phone-এ একাধিক account থাকতে পারে, তাই phone দিয়ে identify করা সম্ভব নয়।
   */
  username: string;
  code: string;
  purpose: "register" | "forgot-password";
  expiresAt: Date;
}

const OtpSchema = new Schema<IOtp>({
  username: { type: String, required: true },
  code: { type: String, required: true },
  purpose: {
    type: String,
    enum: ["register", "forgot-password"],
    required: true,
  },
  expiresAt: { type: Date, required: true },
});

// MongoDB TTL index — expiresAt পার হলে document স্বয়ংক্রিয়ভাবে মুছে যাবে
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Otp = model<IOtp>("Otp", OtpSchema);
