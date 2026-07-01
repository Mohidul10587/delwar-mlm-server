import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof ZodError) {
    const firstError = err.issues[0].message;
    try {
      return res.status(400).json({ message: JSON.parse(firstError) });
    } catch {
      return res.status(400).json({ message: firstError });
    }
  }

  const statusCode: number = err.status || err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === "production";

  // In production, never expose internal error messages for 500 errors
  const message =
    statusCode === 500 && isProduction
      ? { en: "Internal server error", bn: "অভ্যন্তরীণ সার্ভার ত্রুটি" }
      : err.message || { en: "Internal server error", bn: "অভ্যন্তরীণ সার্ভার ত্রুটি" };

  res.status(statusCode).json({ message });
};
