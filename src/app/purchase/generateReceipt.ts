import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

const publicDir = path.join(process.cwd(), "public");

function toDataUrl(filename: string): string {
  const filePath = path.join(publicDir, filename);
  const ext = path.extname(filename).slice(1).replace("jpg", "jpeg");
  const data = fs.readFileSync(filePath).toString("base64");
  return `data:image/${ext};base64,${data}`;
}

export interface ReceiptData {
  purchase: {
    _id: string;
    paymentId?: string;
    paymentType: "cash" | "installment";
    downPayment: number;
    installmentCount: number;
    installmentAmount: number;
    amountPaid: number;
    quantity: number;
    senderAccount: string;
    transactionId: string;
    status: string;
    reviewedAt?: string;
    reviewedBy?: { name?: string; username?: string } | string;
    createdAt: string;
    snapshot?: { shareTitle?: string; cashPrice?: number };
    projectId?: { title?: string; cashPrice?: number };
    userId?: { name?: string; username?: string; phone?: string; customerId?: string };
    buyerInfo?: {
      name?: string;
      phone?: string;
      nominees?: Array<{ name: string; relation?: string; phone?: string }>;
      nominee?: { name: string; relation?: string; phone?: string };
      nominee2?: { name: string; relation?: string; phone?: string };
    };
  };
  installment?: {
    _id: string;
    paymentId?: string;
    installmentNo: number;
    amount: number;
    senderAccount: string;
    transactionId: string;
    status: string;
    reviewedAt?: string;
    reviewedBy?: { name?: string; username?: string } | string;
    createdAt: string;
  };
  shareNumbers?: string[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return "৳" + Number(n).toLocaleString("en-BD");
}

function fmtDate(d: string | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-BD", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function receiptNo(id: string, prefix = "RCP"): string {
  return prefix + "-" + id.slice(-8).toUpperCase();
}

function staffName(rb: any): string {
  if (!rb) return "—";
  if (typeof rb === "string") return rb;
  return rb.name ?? rb.username ?? "—";
}

function takaInWords(amount: number): string {
  if (amount === 0) return "Zero Taka Only";
  const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine",
    "Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  function convert(n: number): string {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n/10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n/100)] + " Hundred" + (n % 100 ? " " + convert(n % 100) : "");
    if (n < 100000) return convert(Math.floor(n/1000)) + " Thousand" + (n % 1000 ? " " + convert(n % 1000) : "");
    if (n < 10000000) return convert(Math.floor(n/100000)) + " Lakh" + (n % 100000 ? " " + convert(n % 100000) : "");
    return convert(Math.floor(n/10000000)) + " Crore" + (n % 10000000 ? " " + convert(n % 10000000) : "");
  }
  return convert(Math.floor(amount)) + " Taka Only";
}

// ── HTML Builder ───────────────────────────────────────────────────────────────
// Mirrors ReceiptBody component in PaymentReceipt.tsx exactly (914×440 canvas)

export function buildReceiptHtml(data: ReceiptData): string {
  const bgUrl = toDataUrl("money-recive-bg.jpeg");

  const { purchase, installment, shareNumbers } = data;

  const shareTitle = purchase.snapshot?.shareTitle ?? (purchase.projectId as any)?.title ?? "—";
  const cashPrice  = purchase.snapshot?.cashPrice  ?? (purchase.projectId as any)?.cashPrice ?? 0;
  const totalPayable = cashPrice * purchase.quantity;

  const buyerName        = purchase.buyerInfo?.name  ?? (purchase.userId as any)?.name  ?? "—";
  const buyerPhone       = purchase.buyerInfo?.phone ?? (purchase.userId as any)?.phone ?? "—";
  const buyerCustomerId  = (purchase.userId as any)?.customerId ?? "—";

  const nominees: Array<{ name: string; relation?: string }> = (() => {
    if (purchase.buyerInfo?.nominees?.length) return purchase.buyerInfo.nominees;
    const list: Array<{ name: string; relation?: string }> = [];
    if (purchase.buyerInfo?.nominee?.name)  list.push(purchase.buyerInfo.nominee);
    if (purchase.buyerInfo?.nominee2?.name) list.push(purchase.buyerInfo.nominee2!);
    return list;
  })();

  const isInstallmentReceipt = !!installment;
  const isCash = purchase.paymentType === "cash";

  const thisPaidAmount = isInstallmentReceipt ? installment!.amount : purchase.downPayment;
  const txId       = isInstallmentReceipt ? installment!.transactionId : purchase.transactionId;
  const senderAcc  = isInstallmentReceipt ? installment!.senderAccount  : purchase.senderAccount;
  const paymentDate = isInstallmentReceipt
    ? (installment!.reviewedAt ?? installment!.createdAt)
    : (purchase.reviewedAt ?? purchase.createdAt);

  const paymentId    = isInstallmentReceipt ? installment!.paymentId : purchase.paymentId;
  const installmentNo = isInstallmentReceipt ? installment!.installmentNo : isCash ? "—" : "Down Payment";

  const rNo = isInstallmentReceipt
    ? receiptNo(installment!._id, "INST")
    : receiptNo(purchase._id, "PUR");

  const shareNoDisplay = shareNumbers?.join(", ") ?? "—";
  const isMobileBanking = !isCash && !!txId;

  const purpose = isInstallmentReceipt
    ? `Installment #${installment!.installmentNo} for ${shareTitle}`
    : isCash
    ? `Full Cash Payment for ${shareTitle}`
    : `Down Payment for ${shareTitle}`;

  const soDo = nominees.length > 0
    ? nominees.map((n) => `${n.name}${n.relation ? ` (${n.relation})` : ""}`).join(", ")
    : "—";

  const dark = "#1a1a2e";
  const blue = "#1a3a8f";

  // Canvas: 914×440 (same as React component)
  const W = 914;
  const H = 440;

  const metaRows = [
    { label: "Receipt No.",            value: rNo },
    { label: "Date",                   value: fmtDate(paymentDate) },
    { label: "Customer ID",            value: buyerCustomerId },
    { label: "Share No. / Product Code", value: shareNoDisplay },
    { label: "Installment No.",        value: String(installmentNo) },
  ];

  const metaHtml = metaRows.map(({ label, value }) => `
    <div style="display:flex;align-items:baseline;gap:4px;font-size:12px;font-weight:700;color:${dark};">
      <span style="min-width:148px;font-weight:600;">${label}</span>
      <span>:</span>
      <span style="font-family:monospace;">${value}</span>
    </div>`).join("");

  const checkBox = (checked: boolean) =>
    `<span style="display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border:1.5px solid #333;font-size:10px;color:${blue};font-weight:900;background:rgba(255,255,255,0.6);">${checked ? "✓" : ""}</span>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { width:${W}px; height:${H}px; overflow:hidden; } /* 914×440 */
</style>
</head>
<body>

<div style="position:relative;width:${W}px;height:${H}px;font-family:'Segoe UI',Arial,sans-serif;color:${dark};background:#fff;overflow:hidden;">

  <!-- Background image -->
  <img src="${bgUrl}" alt="" style="position:absolute;inset:0;width:${W}px;height:${H}px;z-index:0;"/>

  <!-- Content layer -->
  <div style="position:relative;z-index:1;width:${W}px;height:${H}px;box-sizing:border-box;padding:10px 14px 10px 14px;display:flex;flex-direction:column;gap:0;">

    <!-- ROW 1: Top-right meta block -->
    <div style="display:flex;justify-content:flex-end;margin-top:20px;margin-bottom:2px;">
      <div style="display:flex;flex-direction:column;gap:3px;margin-left:auto;">
        ${metaHtml}
      </div>
    </div>

    <!-- ROW 2: Received with thanks from -->
    <div style="display:flex;align-items:baseline;gap:6px;font-size:12px;font-weight:700;color:${dark};margin-top:44px;">
      <span style="white-space:nowrap;">Received with thanks from</span>
      <span style="flex:1;border-bottom:1px dotted #555;padding-bottom:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
        ${buyerName} &nbsp; ${buyerPhone}
      </span>
    </div>

    <!-- ROW 3: S/o, D/o, W/o -->
    <div style="display:flex;align-items:baseline;gap:6px;font-size:12px;font-weight:700;color:${dark};margin-top:10px;">
      <span style="white-space:nowrap;">S/o, D/o, W/o</span>
      <span style="flex:1;border-bottom:1px dotted #555;padding-bottom:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${soDo}</span>
    </div>

    <!-- ROW 4: Sum of Taka -->
    <div style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700;color:${dark};margin-top:10px;">
      <span style="white-space:nowrap;">Sum of Taka</span>
      <span>:</span>
      <span style="border:1.5px solid #333;padding:2px 16px;min-width:180px;font-size:13px;font-weight:700;text-align:center;background:rgba(255,255,255,0.6);">
        ${fmt(thisPaidAmount)}
      </span>
      <span style="white-space:nowrap;">As down payment/installment</span>
    </div>

    <!-- ROW 5: Mode of Payment -->
    <div style="display:flex;gap:8px;font-size:12px;font-weight:700;color:${dark};margin-top:10px;">
      <span style="white-space:nowrap;">Mode of Payment &nbsp; :</span>
      <div style="display:flex;flex-direction:column;gap:4px;">
        <!-- CASH -->
        <div style="display:flex;align-items:center;gap:6px;">
          ${checkBox(isCash)}
          <span>CASH</span>
        </div>
        <!-- CHEQUE -->
        <div style="display:flex;align-items:center;gap:6px;">
          ${checkBox(false)}
          <span>CHEQUE</span>
          <span style="margin-left:8px;color:#555;font-weight:400;">Cheque No. ……………… &nbsp; Bank Name ………………… &nbsp; Branch Name …………………</span>
        </div>
        <!-- MOBILE BANKING -->
        <div style="display:flex;align-items:center;gap:6px;">
          ${checkBox(isMobileBanking)}
          <span>MOBILE BANKING</span>
          ${isMobileBanking
            ? `<span style="margin-left:8px;font-family:monospace;font-weight:700;">${txId}${senderAcc && senderAcc !== "—" ? ` (${senderAcc})` : ""}</span>`
            : `<span style="margin-left:8px;color:#555;font-weight:400;">Transaction ID / Reference No. ………………………………………………</span>`
          }
        </div>
      </div>
    </div>

    <!-- ROW 6: Purpose of Payment -->
    <div style="display:flex;align-items:baseline;gap:6px;font-size:12px;font-weight:700;color:${dark};margin-top:10px;">
      <span style="white-space:nowrap;">Purpose of Payment</span>
      <span>:</span>
      <span style="flex:1;border-bottom:1px dotted #555;padding-bottom:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${purpose}</span>
    </div>

    <!-- ROW 7: Amount in words -->
    <div style="display:flex;align-items:baseline;gap:6px;font-size:12px;font-weight:700;color:${dark};margin-top:8px;">
      <span style="white-space:nowrap;">Amount in words</span>
      <span>:</span>
      <span style="flex:1;border-bottom:1px dotted #555;padding-bottom:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${takaInWords(thisPaidAmount)}</span>
    </div>

  </div>
</div>

</body>
</html>`;
}

// ── PNG Generator ──────────────────────────────────────────────────────────────

export async function generateReceiptPng(data: ReceiptData): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 914, height: 440, deviceScaleFactor: 1 });
    await page.setContent(buildReceiptHtml(data), { waitUntil: "networkidle0" });
    const screenshot = await page.screenshot({
      type: "png",
      clip: { x: 0, y: 0, width: 914, height: 440 },
    });
    return Buffer.from(screenshot);
  } finally {
    await browser.close();
  }
}
