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
      .populate("purchaseId", "paymentType amountPaid quantity status transactionId createdAt buyerInfo downPayment installmentCount installmentAmount snapshot paymentId")
      .populate("userId", "name phone email fatherName nid address username nominee dateOfBirth district upazila customerId")
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
  const ts = new Date().toISOString();
  const certId = req.params.id;
  const userId = req.user!._id;

  console.log(`[CERT-CTRL][${ts}] ── downloadCertificate called ──`);
  console.log(`[CERT-CTRL][${ts}] certId=${certId}  userId=${userId}`);
  console.log(`[CERT-CTRL][${ts}] NODE_ENV=${process.env.NODE_ENV ?? "(not set)"}`);

  try {
    // ── Step A: Find certificate ──────────────────────────────────────────
    console.log(`[CERT-CTRL][${ts}] STEP A: Looking up certificate in DB`);
    const cert = await Certificate.findOne({ _id: certId, userId })
      .populate("projectId", "title image cashPrice")
      .populate("purchaseId", "paymentType amountPaid quantity status transactionId createdAt buyerInfo downPayment installmentCount installmentAmount snapshot paymentId")
      .populate("userId", "name phone email fatherName nid address username nominee dateOfBirth district upazila customerId")
      .lean();

    if (!cert) {
      console.log(`[CERT-CTRL][${ts}] STEP A: Certificate NOT found (id=${certId}, userId=${userId})`);
      return res.status(404).json({ message: "Certificate not found" });
    }
    console.log(`[CERT-CTRL][${ts}] STEP A: Certificate found  status=${cert.status}`);

    if (cert.status !== "issued") {
      console.log(`[CERT-CTRL][${ts}] STEP A: Certificate not issued yet  status=${cert.status}`);
      return res.status(403).json({ message: "Certificate not yet issued" });
    }

    // ── Step B: Compute totals ─────────────────────────────────────────────
    const share    = cert.projectId as any;
    const purchase = cert.purchaseId as any;
    const totalPayable = share?.cashPrice
      ? calculateTotalPayable(Number(share.cashPrice), purchase?.quantity ?? 1)
      : 0;
    const amountPaid = purchase?.amountPaid ?? 0;
    console.log(`[CERT-CTRL][${ts}] STEP B: totalPayable=${totalPayable}  amountPaid=${amountPaid}  qty=${purchase?.quantity}`);

    // ── Step C: Fetch share slots ──────────────────────────────────────────
    console.log(`[CERT-CTRL][${ts}] STEP C: Fetching share slots for purchaseId=${purchase?._id}`);
    const slots = await ShareSlot.find({ purchaseId: purchase?._id, status: "sold" })
      .select("shareNumber")
      .sort({ shareNumber: 1 })
      .lean();
    console.log(`[CERT-CTRL][${ts}] STEP C: Found ${slots.length} share slot(s)`);

    const certData = {
      ...cert,
      totalPayable,
      amountRemaining: Math.max(0, totalPayable - amountPaid),
      shareNumbers: slots.map((s) => s.shareNumber),
    } as any;

    // ── Step D: Generate PNG ───────────────────────────────────────────────
    console.log(`[CERT-CTRL][${ts}] STEP D: Calling generateCertificatePng`);
    let pngBuffer: Buffer;
    try {
      pngBuffer = await generateCertificatePng(certData);
      console.log(`[CERT-CTRL][${ts}] STEP D: PNG generated  bytes=${pngBuffer.length}`);
    } catch (genErr: any) {
      console.error(`[CERT-CTRL][${ts}] STEP D FAILED: generateCertificatePng threw:`, genErr);
      // Return a JSON error so the client/frontend can show a meaningful message
      // instead of a silent "Download failed" toast
      return res.status(500).json({
        message: "Certificate generation failed on server",
        error: genErr?.message ?? String(genErr),
        stack: process.env.NODE_ENV === "development" ? genErr?.stack : undefined,
      });
    }

    if (!pngBuffer || pngBuffer.length === 0) {
      console.error(`[CERT-CTRL][${ts}] STEP D: PNG buffer is empty — generation silently failed`);
      return res.status(500).json({ message: "Certificate generation produced an empty file" });
    }

    // ── Step E: Send response ──────────────────────────────────────────────
    console.log(`[CERT-CTRL][${ts}] STEP E: Sending PNG response  bytes=${pngBuffer.length}`);
    res.set({
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="certificate-${cert._id}.png"`,
      "Content-Length": pngBuffer.length,
      "Cache-Control": "no-store",
    });
    res.send(pngBuffer);
    console.log(`[CERT-CTRL][${ts}] STEP E: Response sent successfully`);
  } catch (err) {
    console.error(`[CERT-CTRL][${ts}] UNHANDLED ERROR in downloadCertificate:`, err);
    next(err);
  }
};
