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

export interface CertData {
  _id: string;
  status: string;
  issuedAt?: Date;
  totalPayable: number;
  amountRemaining: number;
  shareNumbers: string[];
  shareId: {
    title: string;
    cashPrice: number;
  };
  purchaseId: {
    paymentType: string;
    amountPaid: number;
    quantity: number;
    downPayment: number;
    installmentCount: number;
    installmentAmount: number;
    transactionId: string;
    createdAt: Date;
    buyerInfo?: any;
  };
  userId: {
    name: string;
    phone: string;
    nominee?: { name: string; relation: string; phone: string };
    dateOfBirth?: string;
    district?: string;
    upazila?: string;
  };
}

function buildHtml(c: CertData): string {
  const bgUrl    = toDataUrl("certificate-bg.jpg");
  const logoUrl  = toDataUrl("sea-maiden.png");
  const tuneUrl  = toDataUrl("tune.png");
  const signUrl  = toDataUrl("Sign (1).png");

  const buyer   = c.purchaseId?.buyerInfo ?? c.userId;
  const share   = c.shareId;
  const purchase = c.purchaseId;
  const isIssued = c.status === "issued";
  const fmt      = (n: number) => Number(n).toLocaleString("en-BD");
  const fmtDate  = (d?: Date | string) => d ? new Date(d).toLocaleDateString("en-BD") : "—";

  const isInstallment = purchase?.paymentType === "installment";
  const dp    = (purchase?.downPayment ?? 0) * (purchase?.quantity ?? 1);
  const perInst = (purchase?.installmentAmount ?? 0) * (purchase?.quantity ?? 1);
  const totalInst = purchase?.installmentCount ?? 0;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { width:4961px; height:3093px; font-family:serif; line-height:1.7; overflow:hidden;
    background:url('${bgUrl}') no-repeat center center; background-size:100% 100%; }
  .inner { position:absolute; inset:0; margin:10% 10% 4% 10%; display:flex; flex-direction:column; gap:28px; overflow:hidden; }
  .header { text-align:center; border-bottom:2px dashed #b8860b; padding-bottom:24px; }
  .header img { height:400px; margin:0 auto 8px; object-fit:contain; display:block; }
  .header h1 { font-size:152px; font-weight:bold; letter-spacing:2px; color:#7a4f10; margin:4px 0; }
  .header p  { font-size:58px; color:#92681a; }
  .header p span { font-family:monospace; font-weight:600; }
  .intro   { font-size:74px; color:#5c3a0a; text-align:justify; }
  .details { font-size:74px; color:#5c3a0a; }
  .lbl  { color:#92681a; }
  .dot  { margin:0 30px; }
  .shares { font-size:74px; color:#5c3a0a; }
  .holder { border-top:2px dashed #b8860b; padding-top:20px; font-size:74px; color:#5c3a0a; text-align:justify; }
  .disclaimer { font-size:56px; color:#7a4f10; text-align:center; font-style:italic; margin-top:100px; }
  .footer { position:absolute; bottom:80px; left:0; width:100%; padding:0 224px;
    display:flex; align-items:flex-end; justify-content:space-between;
    border-top:1px solid #b8860b; padding-top:16px; font-size:74px; color:#92681a; }
  .footer-left  { display:flex; align-items:center; gap:16px; color:#78350f; }
  .footer-left img { height:180px; object-fit:contain; }
  .footer-right { text-align:right; }
  .footer-right img { height:120px; margin-left:auto; object-fit:contain; display:block; margin-bottom:6px; }
  .sig-line { width:160px; border-top:1px solid #7a4f10; margin-bottom:6px; }
</style>
</head>
<body>
<div class="inner">

  <div class="header">
    <img src="${logoUrl}" alt="logo" />
    <h1>${isIssued ? "Share Certificate" : "Certificate (Pending)"}</h1>
    <p>Certificate No: <span>${c._id}</span></p>
  </div>

  <p class="intro">
    This is to certify that <b>${buyer?.name ?? "—"}</b>
    is a registered holder of <b>${purchase?.quantity ?? "—"}</b> share(s) of
    <b>${share?.title}</b>, each valued at <b>৳${fmt(share?.cashPrice ?? 0)}</b>,
    totalling <b>৳${fmt(c.totalPayable)}</b>.
  </p>

  <p class="details">
    <span class="lbl">Payment Type: </span><b style="text-transform:capitalize">${purchase?.paymentType ?? "—"}</b>
    <span class="dot">·</span>
    <span class="lbl">Amount Paid: </span><b>৳${fmt(purchase?.amountPaid ?? 0)}</b>
    ${c.amountRemaining > 0 ? `<span class="dot">·</span><span class="lbl">Remaining: </span><b>৳${fmt(c.amountRemaining)}</b>` : ""}
    <span class="dot">·</span>
    <span class="lbl">Purchase Date: </span><b>${fmtDate(purchase?.createdAt)}</b>
    <span class="dot">·</span>
    <span class="lbl">Issue Date: </span><b>${c.issuedAt ? fmtDate(c.issuedAt) : "Pending"}</b>
  </p>

  ${isInstallment ? `
  <p class="details">
    <span class="lbl">Down Payment: </span><b>৳${fmt(dp)}</b>
    <span class="dot">·</span>
    <span class="lbl">Per Installment: </span><b>৳${fmt(perInst)}</b>
    <span class="dot">·</span>
    <span class="lbl">Total Installments: </span><b>${totalInst}</b>
  </p>` : ""}

  ${c.shareNumbers?.length > 0 ? `
  <p class="shares">
    <span class="lbl">Assigned Share Numbers: </span>
    <span style="font-family:monospace;font-weight:600">${c.shareNumbers.join(", ")}</span>
  </p>` : ""}

  <div class="holder">
    The holder's personal details are as follows —
    ${buyer?.phone    ? `<span class="lbl">Phone: </span><b>${buyer.phone}</b>; ` : ""}
    ${buyer?.dateOfBirth ? `<span class="lbl">Date of Birth: </span><b>${buyer.dateOfBirth}</b>; ` : ""}
    ${(buyer?.district || buyer?.upazila) ? `<span class="lbl">Area: </span><b>${[buyer?.upazila, buyer?.district].filter(Boolean).join(", ")}</b>.` : ""}
    ${buyer?.nominee?.name ? ` In the event of the holder's demise, the nominee shall be <b>${buyer.nominee.name}</b> (<b>${buyer.nominee.relation}</b>, <b>${buyer.nominee.phone}</b>).` : ""}
  </div>

  <p class="disclaimer">
    This certificate is issued under the authority of the organization and is valid subject to the terms and conditions of the share agreement.
  </p>

  <div class="footer">
    <div class="footer-left">
      <p>Issued By</p>
      <img src="${tuneUrl}" alt="logo" />
    </div>
    <div class="footer-right">
      <img src="${signUrl}" alt="signature" />
      <div class="sig-line"></div>
      <p style="color:#78350f">Authorized Signature</p>
    </div>
  </div>

</div>
</body>
</html>`;
}

export async function generateCertificatePng(c: CertData): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 4961, height: 3093, deviceScaleFactor: 1 });
    await page.setContent(buildHtml(c), { waitUntil: "networkidle0" });
    const screenshot = await page.screenshot({
      type: "png",
      clip: { x: 0, y: 0, width: 4961, height: 3093 },
    });
    return Buffer.from(screenshot);
  } finally {
    await browser.close();
  }
}
