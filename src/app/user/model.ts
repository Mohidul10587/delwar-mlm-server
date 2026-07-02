import mongoose, { Schema, model, Document } from "mongoose";

export interface IAncestorEntry {
  level: number; // 1 = direct parent, 2 = grandparent, etc.
  userId: mongoose.Types.ObjectId;
}

export interface INominee {
  name: string;
  relation: string;
  phone: string;
  nid?: string;
  image?: string;
}

export interface IPaymentMethods {
  bank?: string;
  bkash?: string;
  nagad?: string;
  rocket?: string;
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  username: string;
  name: string;
  phone: string;
  password: string;
  role: "superadmin" | "admin" | "staff" | "user";
  isActive: boolean;
  image: string | null;
  coverImage?: string | null;
  linkedPhoneAccounts: mongoose.Types.ObjectId[];
  permissions: string[];
  generationAncestors: IAncestorEntry[];
  directSalesCount: number;
  teamSalesCount: number;
  currentRank: string | null;
  currentRankAchievedAt?: Date;
  earnedRanks: string[];
  personalSharesCount: number;
  nominee?: INominee;
  nominee2?: INominee;
  district?: string;
  upazila?: string;
  dateOfBirth?: string;
  paymentMethods?: IPaymentMethods;
}

const AncestorEntrySchema = new Schema<IAncestorEntry>(
  {
    level: { type: Number, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["superadmin", "admin", "staff", "user"],
      default: "user",
    },
    isActive: { type: Boolean, default: true },
    image: { type: String, default: null },
    coverImage: { type: String, default: null },
    linkedPhoneAccounts: [{ type: Schema.Types.ObjectId, ref: "User" }],
    permissions: [{ type: String }],
    generationAncestors: [AncestorEntrySchema],
    directSalesCount: { type: Number, default: 0 },
    teamSalesCount: { type: Number, default: 0 },
    currentRank: { type: String, default: null },
    currentRankAchievedAt: { type: Date, default: null },
    earnedRanks: [{ type: String }],
    personalSharesCount: { type: Number, default: 0 },

    nominee: {
      type: {
        name: String,
        relation: String,
        phone: String,
        nid: String,
        image: String,
      },
      default: null,
    },
    nominee2: {
      type: {
        name: String,
        relation: String,
        phone: String,
        nid: String,
        image: String,
      },
      default: null,
    },
    district: { type: String, default: null },
    upazila: { type: String, default: null },
    dateOfBirth: { type: String, default: null },
    paymentMethods: {
      type: {
        bank: { type: String, default: null },
        bkash: { type: String, default: null },
        nagad: { type: String, default: null },
        rocket: { type: String, default: null },
      },
      default: null,
    },
  },
  { timestamps: true }
);

// Fix D-01: Add indexes for frequently queried fields
UserSchema.index({ phone: 1 });
UserSchema.index({ "generationAncestors.userId": 1 });
UserSchema.index({ currentRank: 1 });
UserSchema.index({ "generationAncestors.0.userId": 1 });
// Achievers Gallery: compound index for rank filtering + date sorting
UserSchema.index({ currentRank: 1, currentRankAchievedAt: 1 });

export const User = model<IUser>("User", UserSchema);
