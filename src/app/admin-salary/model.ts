import { Schema, model, Document, Types } from "mongoose";

// ─── Admin Salary Config ──────────────────────────────────────────────────────
// Stores the monthly salary amount set by super admin for each admin user.

export interface IAdminSalaryConfig extends Document {
  adminId: Types.ObjectId;   // ref: User (role: admin)
  monthlySalary: number;     // amount set by super admin
  createdAt: Date;
  updatedAt: Date;
}

const AdminSalaryConfigSchema = new Schema<IAdminSalaryConfig>(
  {
    adminId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    monthlySalary: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

// ─── Admin Salary Release ─────────────────────────────────────────────────────
// A record for each monthly salary payment released to an admin.

export interface IAdminSalaryRelease extends Document {
  adminId: Types.ObjectId;
  amount: number;
  month: string;           // "YYYY-MM" format, e.g. "2026-07"
  releasedBy: Types.ObjectId;  // super admin user id
  note?: string;
  createdAt: Date;
}

const AdminSalaryReleaseSchema = new Schema<IAdminSalaryRelease>(
  {
    adminId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, min: 0 },
    month: { type: String, required: true },  // "YYYY-MM"
    releasedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

// Compound unique index: prevent double-releasing salary for same admin+month
AdminSalaryReleaseSchema.index({ adminId: 1, month: 1 }, { unique: true });

export const AdminSalaryConfig = model<IAdminSalaryConfig>("AdminSalaryConfig", AdminSalaryConfigSchema);
export const AdminSalaryRelease = model<IAdminSalaryRelease>("AdminSalaryRelease", AdminSalaryReleaseSchema);
