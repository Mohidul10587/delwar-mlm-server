import { NextFunction, Request, Response } from "express";
import { Capital } from "./model";
import { createCapital, deleteCapital, parseCapitalInput, updateCapital } from "./service";

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const capital = await createCapital(parseCapitalInput(req.body), req.user!._id);
    res.status(201).json({ message: "Capital entry created", capital });
  } catch (error) { next(error); }
};

export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search = "", from, to, page = "1", limit = "20", sort = "date", order = "desc" } = req.query as Record<string, string>;
    const currentPage = Math.max(1, Number.parseInt(page, 10) || 1);
    const pageLimit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 20));
    const filter: Record<string, unknown> = {};
    if (search.trim()) {
      const expression = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ description: expression }, { paidBy: expression }, { voucherNo: expression }, { paymentInfo: expression }];
    }
    if (from || to) {
      filter.date = {};
      if (from) (filter.date as Record<string, Date>).$gte = new Date(from);
      if (to) { const end = new Date(to); end.setHours(23, 59, 59, 999); (filter.date as Record<string, Date>).$lte = end; }
    }
    const sortFields = new Set(["date", "amount", "createdAt", "paidBy", "voucherNo"]);
    const sortField = sortFields.has(sort) ? sort : "date";
    const sortDirection = order === "asc" ? 1 : -1;
    const [capitals, total] = await Promise.all([
      Capital.find(filter).sort({ [sortField]: sortDirection, _id: -1 }).skip((currentPage - 1) * pageLimit).limit(pageLimit).lean(),
      Capital.countDocuments(filter),
    ]);
    res.json({ capitals, total, page: currentPage, limit: pageLimit, pages: Math.ceil(total / pageLimit) });
  } catch (error) { next(error); }
};

export const getOne = async (req: Request, res: Response, next: NextFunction) => {
  try { const capital = await Capital.findById(req.params.id).lean(); if (!capital) return res.status(404).json({ message: "Capital entry not found" }); res.json({ capital }); } catch (error) { next(error); }
};
export const update = async (req: Request, res: Response, next: NextFunction) => {
  try { const capital = await updateCapital(req.params.id, parseCapitalInput(req.body), req.user!._id); res.json({ message: "Capital entry updated", capital }); } catch (error) { next(error); }
};
export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try { await deleteCapital(req.params.id); res.json({ message: "Capital entry deleted" }); } catch (error) { next(error); }
};
