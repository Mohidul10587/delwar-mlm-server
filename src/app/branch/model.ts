import { Schema, model, Document, Types } from "mongoose";

export interface IBranch extends Document {
  _id: Types.ObjectId;
  name: string;
  address?: string;
  managerId: Types.ObjectId; // ref: User (role: branch_manager)
  isActive: boolean;
}

const BranchSchema = new Schema<IBranch>(
  {
    name: { type: String, required: true, unique: true },
    address: { type: String, default: "" },
    managerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Branch = model<IBranch>("Branch", BranchSchema);
