import { Schema, model, Document } from "mongoose";
import slugify from "slugify";

export interface ICategory extends Document {
  title: string;
  image?: string | null;
  order: number;
  slug: string;
}

const CategorySchema = new Schema<ICategory>(
  {
    title: { type: String, required: true },
    image: { type: String, default: null },
    order: { type: Number, default: 0 },
    slug: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

// Auto-generate slug from title before saving
CategorySchema.pre("save", function (next) {
  if (this.isModified("title") || !this.slug) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  next();
});

// Index for fast ordered queries and slug lookups
CategorySchema.index({ order: 1 });
CategorySchema.index({ slug: 1 });

export const Category = model<ICategory>("Category", CategorySchema);
