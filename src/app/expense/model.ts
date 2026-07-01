import { Schema, model, Document } from "mongoose";

export const EXPENSE_CATEGORIES = [
  "office_rent",
  "salaries_staff",
  "utilities",
  "marketing",
  "software",
  "hardware",
  "travel",
  "maintenance",
  "legal",
  "miscellaneous",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface IExpense extends Document {
  date: Date;
  category: ExpenseCategory;
  amount: number;
  description: string;
  recordedBy: string; // admin username
}

const ExpenseSchema = new Schema<IExpense>(
  {
    date:        { type: Date, required: true, index: true },
    category:    { type: String, enum: EXPENSE_CATEGORIES, required: true, index: true },
    amount:      { type: Number, required: true, min: 0 },
    description: { type: String, required: true, trim: true },
    recordedBy:  { type: String, required: true },
  },
  { timestamps: true }
);

ExpenseSchema.index({ date: -1, category: 1 });

export const Expense = model<IExpense>("Expense", ExpenseSchema);
