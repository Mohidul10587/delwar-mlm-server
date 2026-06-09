import { Schema, model, Document } from "mongoose";

export interface ICategory extends Document {
  title: string;
  image?: string;
}

const CategorySchema = new Schema<ICategory>(
  {
    title: { type: String, required: true },
    image: { type: String },
  },
  { timestamps: true }
);

export const Category = model<ICategory>("Category", CategorySchema);
