import { Request, Response, NextFunction } from "express";
import { Category } from "./model";

export const getCategories = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 }).lean();
    res.json({ categories });
  } catch (err) { next(err); }
};

export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json({ message: "Category created", category });
  } catch (err) { next(err); }
};

export const updateCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!category) return res.status(404).json({ message: "Category not found" });
    res.json({ message: "Category updated", category });
  } catch (err) { next(err); }
};

export const deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });
    res.json({ message: "Category deleted" });
  } catch (err) { next(err); }
};
