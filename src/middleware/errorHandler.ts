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
    return res.status(400).json({ message: JSON.parse(firstError) });
  }

  res.status(err.status || 500).json({
    message: err.message || {
      en: "Internal server error",
      bn: "অভ্যন্তরীণ সার্ভার ত্রুটি",
    },
  });
};
