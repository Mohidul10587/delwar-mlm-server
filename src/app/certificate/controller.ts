import { Request, Response, NextFunction } from "express";
import { Certificate } from "./model";
import { calculateTotalPayable } from "../purchase/service";
import { ShareSlot } from "../project/shareSlot.model";
import { generateCertificatePng } from "./generateCertificate";

// GET /certificate/my — logged-in user's own certificates with share & purchase info
export const getMyCertificates = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const certificates = await Certificate.find({ userId: req.user!._id })
      .populate("projectId", "title image cashPrice")
      .populate("purchaseId", "paymentType amountPaid quantity status transactionId createdAt buyerInfo downPayment installmentCount installmentAmount snapshot")
      .populate("userId", "name phone email fatherName nid address username nominee dateOfBirth district upazila")
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
      const share    = c.projectId as any;
      const purchase = c.purchaseId as any;
      const purchaseKey = purchase?._id?.toString();
      const totalPayable = share?.cashPrice
        ? calculateTotalPayable(Number(share.cashPrice), purchase?.quantity ?? 1)
        : 0;
      const amountPaid = purchase?.amountPaid ?? 0;
      // If slots found by purchaseId use them; otherwise fall back to checking
      // slots by userId+projectId (covers legacy records where purchaseId was not set).
      const shareNumbers = slotsByPurchase[purchaseKey ?? ""] ?? [];
      return {
        ...c,
        totalPayable,
        amountRemaining: Math.max(0, totalPayable - amountPaid),
        shareNumbers,
      };
    });

    // Second pass: for any cert that still has no share numbers, try userId+projectId fallback
    const missingCertIds = enriched
      .filter((c) => c.shareNumbers.length === 0)
      .map((c) => ({ certId: (c as any)._id?.toString(), userId: (c as any).userId?._id ?? (c as any).userId, projectId: (c as any).projectId?._id ?? (c as any).projectId }));

    if (missingCertIds.length > 0) {
      const userIds    = [...new Set(missingCertIds.map((x) => x.userId?.toString()).filter(Boolean))];
      const projectIds = [...new Set(missingCertIds.map((x) => x.projectId?.toString()).filter(Boolean))];
      const fallbackSlots = await ShareSlot.find({
        userId: { $in: userIds },
        projectId: { $in: projectIds },
        status: "sold",
      })
        .select("userId projectId purchaseId shareNumber")
        .sort({ shareNumber: 1 })
        .lean();

      // Group fallback slots by "userId|projectId"
      const fallbackMap: Record<string, string[]> = {};
      for (const s of fallbackSlots) {
        const key = `${s.userId?.toString()}|${s.projectId?.toString()}`;
        (fallbackMap[key] ??= []).push(s.shareNumber);
      }

      for (const cert of enriched) {
        if ((cert as any).shareNumbers.length > 0) continue;
        const userId    = (cert as any).userId?._id?.toString() ?? (cert as any).userId?.toString();
        const projectId = (cert as any).projectId?._id?.toString() ?? (cert as any).projectId?.toString();
        const key = `${userId}|${projectId}`;
        if (fallbackMap[key]) {
          (cert as any).shareNumbers = fallbackMap[key];
        }
      }
    }

    res.json({ certificates: enriched });
  } catch (err) { next(err); }
};

// GET /certificate/:id/download — server-side PNG generation
export const downloadCertificate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cert = await Certificate.findOne({ _id: req.params.id, userId: req.user!._id })
      .populate("projectId", "title image cashPrice")
      .populate("purchaseId", "paymentType amountPaid quantity status transactionId createdAt buyerInfo downPayment installmentCount installmentAmount snapshot")
      .populate("userId", "name phone email fatherName nid address username nominee dateOfBirth district upazila")
      .lean();

    if (!cert)
      return res.status(404).json({ message: "Certificate not found" });
    if (cert.status !== "issued")
      return res.status(403).json({ message: "Certificate not yet issued" });

    const share    = cert.projectId as any;
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
