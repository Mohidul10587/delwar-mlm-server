import { Request, Response, NextFunction } from "express";
import { Certificate } from "./model";
import { calculateTotalPayable } from "../purchase/service";
import { ShareSlot } from "../project/shareSlot.model";
import { generateCertificatePng } from "./generateCertificate";

// GET /certificate/my — logged-in user's own certificates with share & purchase info
export const getMyCertificates = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const certificates = await Certificate.find({ userId: req.user!._id })
      .populate("shareId", "title image cashPrice")
      .populate("purchaseId", "paymentType amountPaid quantity status transactionId createdAt buyerInfo downPayment installmentCount installmentAmount snapshot")
      .populate("userId", "name phone nominee dateOfBirth district upazila")
      .sort({ createdAt: -1 })
      .lean();

    // Fetch share slots for all purchases in one query
    const purchaseIds = certificates.map((c) => (c.purchaseId as any)?._id).filter(Boolean);
    const slots = purchaseIds.length
      ? await ShareSlot.find({ purchaseId: { $in: purchaseIds }, status: "sold" })
          .select("purchaseId shareNumber")
          .sort({ shareNumber: 1 })
          .lean()
      : [];

    const slotsByPurchase: Record<string, string[]> = {};
    for (const s of slots) {
      const key = s.purchaseId!.toString();
      (slotsByPurchase[key] ??= []).push(s.shareNumber);
    }

    const enriched = certificates.map((c) => {
      const share    = c.shareId as any;
      const purchase = c.purchaseId as any;
      const totalPayable = share?.cashPrice
        ? calculateTotalPayable(Number(share.cashPrice), purchase?.quantity ?? 1)
        : 0;
      const amountPaid = purchase?.amountPaid ?? 0;
      return {
        ...c,
        totalPayable,
        amountRemaining: Math.max(0, totalPayable - amountPaid),
        shareNumbers: slotsByPurchase[purchase?._id?.toString()] ?? [],
      };
    });

    res.json({ certificates: enriched });
  } catch (err) { next(err); }
};

// GET /certificate/:id/download — server-side PNG generation
export const downloadCertificate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cert = await Certificate.findOne({ _id: req.params.id, userId: req.user!._id })
      .populate("shareId", "title image cashPrice")
      .populate("purchaseId", "paymentType amountPaid quantity status transactionId createdAt buyerInfo downPayment installmentCount installmentAmount snapshot")
      .populate("userId", "name phone nominee dateOfBirth district upazila")
      .lean();

    if (!cert)
      return res.status(404).json({ message: "Certificate not found" });
    if (cert.status !== "issued")
      return res.status(403).json({ message: "Certificate not yet issued" });

    const share    = cert.shareId as any;
    const purchase = cert.purchaseId as any;
    const totalPayable = share?.cashPrice
      ? calculateTotalPayable(Number(share.cashPrice), purchase?.quantity ?? 1)
      : 0;
    const amountPaid = purchase?.amountPaid ?? 0;

    const slots = await ShareSlot.find({ purchaseId: purchase?._id, status: "sold" })
      .select("shareNumber")
      .sort({ shareNumber: 1 })
      .lean();

    const certData = {
      ...cert,
      totalPayable,
      amountRemaining: Math.max(0, totalPayable - amountPaid),
      shareNumbers: slots.map((s) => s.shareNumber),
    } as any;

    const pngBuffer = await generateCertificatePng(certData);

    res.set({
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="certificate-${cert._id}.png"`,
      "Content-Length": pngBuffer.length,
      "Cache-Control": "no-store",
    });
    res.send(pngBuffer);
  } catch (err) { next(err); }
};
