import { Request, Response, NextFunction } from "express";
import { v2 as cloudinary } from "cloudinary";
import slugify from "slugify";
import dotenv from "dotenv";
import { Category } from "./model";
import { Project } from "../project/model";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Extract Cloudinary public_id from a secure_url */
function extractPublicId(url: string): string | null {
  try {
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-z]+)?$/i);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/** Delete a Cloudinary image by URL (best-effort, never throws) */
async function deleteCloudinaryImage(imageUrl: string): Promise<void> {
  try {
    const publicId = extractPublicId(imageUrl);
    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
    }
  } catch {
    // Silently ignore; deletion failure should not block the API response
  }
}

/**
 * Generate a unique slug for the given title.
 * Appends a numeric suffix if the base slug is already taken (excluding the
 * current document when updating).
 */
async function generateUniqueSlug(
  title: string,
  excludeId?: string
): Promise<string> {
  const base = slugify(title, { lower: true, strict: true });
  let candidate = base;
  let counter = 1;

  while (true) {
    const query: Record<string, unknown> = { slug: candidate };
    if (excludeId) query._id = { $ne: excludeId };
    const exists = await Category.exists(query);
    if (!exists) return candidate;
    candidate = `${base}-${counter}`;
    counter++;
  }
}

// ─── GET /category ────────────────────────────────────────────────────────────

export const getCategories = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const categories = await Category.find()
      .sort({ order: 1, createdAt: 1 })
      .lean();
    res.json({ categories });
  } catch (err) {
    next(err);
  }
};

// ─── GET /category/by-slug/:slug ─────────────────────────────────────────────

export const getCategoryBySlug = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const category = await Category.findOne({
      slug: req.params.slug,
    }).lean();
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    res.json({ category });
  } catch (err) {
    next(err);
  }
};

// ─── GET /category/by-slug/:slug/projects ─────────────────────────────────────

export const getCategoryProjects = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const category = await Category.findOne({
      slug: req.params.slug,
    })
      .select("_id title slug image")
      .lean();

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Only active projects for public display, ordered by createdAt desc
    const projects = await Project.find({
      categoryId: String(category._id),
      isActive: true,
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ category, projects });
  } catch (err) {
    next(err);
  }
};

// ─── POST /category ───────────────────────────────────────────────────────────

export const createCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const maxDoc = await Category.findOne()
      .sort({ order: -1 })
      .select("order")
      .lean();
    const nextOrder = maxDoc ? maxDoc.order + 1 : 0;

    // Generate unique slug from provided title
    const slug = await generateUniqueSlug(req.body.title);

    const category = await Category.create({
      ...req.body,
      order: nextOrder,
      slug,
    });
    res.status(201).json({ message: "Category created", category });
  } catch (err) {
    next(err);
  }
};

// ─── PUT /category/:id ────────────────────────────────────────────────────────

export const updateCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const existing = await Category.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Rebuild slug only when the title actually changes
    let newSlug = existing.slug;
    if (req.body.title && req.body.title !== existing.title) {
      newSlug = await generateUniqueSlug(req.body.title, req.params.id);
    }

    // Image cleanup
    const incomingImage = req.body.image;
    const isRemovingImage =
      (incomingImage === null || incomingImage === "") && existing.image;

    if (isRemovingImage && existing.image) {
      await deleteCloudinaryImage(existing.image);
    }
    if (
      incomingImage &&
      existing.image &&
      incomingImage !== existing.image
    ) {
      await deleteCloudinaryImage(existing.image);
    }

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { $set: { ...req.body, slug: newSlug } },
      { new: true }
    );

    res.json({ message: "Category updated", category });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /category/:id ─────────────────────────────────────────────────────

export const deleteCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    if (category.image) {
      await deleteCloudinaryImage(category.image);
    }
    res.json({ message: "Category deleted" });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /category/reorder ─────────────────────────────────────────────────

export const reorderCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { items } = req.body as { items: { id: string; order: number }[] };

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "items array is required" });
    }

    for (const item of items) {
      if (!item.id || typeof item.order !== "number") {
        return res
          .status(400)
          .json({ message: "Each item must have id and order (number)" });
      }
    }

    const bulkOps = items.map(({ id, order }) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { order } },
      },
    }));

    await Category.bulkWrite(bulkOps);
    res.json({ message: "Categories reordered successfully" });
  } catch (err) {
    next(err);
  }
};
