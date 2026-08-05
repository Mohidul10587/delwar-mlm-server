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
  projectId: { title: string; cashPrice: number };
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
    email?: string;
    fatherName?: string;
    address?: string;
    nid?: string;
    customerId?: string;
    nominee?: { name: string; relation: string; phone: string };
    dateOfBirth?: string;
    district?: string;
    upazila?: string;
  };
}

function numberToWords(n: number): string {
  const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine",
    "Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  if (n === 0) return "Zero";
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n/10)] + (n % 10 ? " " + ones[n % 10] : "");
  if (n < 1000) return ones[Math.floor(n/100)] + " Hundred" + (n % 100 ? " " + numberToWords(n % 100) : "");
  if (n < 100000) return numberToWords(Math.floor(n/1000)) + " Thousand" + (n % 1000 ? " " + numberToWords(n % 1000) : "");
  if (n < 10000000) return numberToWords(Math.floor(n/100000)) + " Lakh" + (n % 100000 ? " " + numberToWords(n % 100000) : "");
  return numberToWords(Math.floor(n/10000000)) + " Crore" + (n % 10000000 ? " " + numberToWords(n % 10000000) : "");
}

function getCss(bgUrl: string): string {
  return `
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    width:4961px; height:3508px;
    font-family:'Georgia', serif;
    background: url('${bgUrl}') no-repeat center center;
    background-size: 100% 100%;
    overflow: hidden;
  }
  .page {
    position: absolute;
    inset: 0;
    padding: 160px 220px 140px 220px;
    display: flex;
    flex-direction: column;
    gap: 50px;
  }

  /* ── TOP BAR ── */
  .top-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 68px;
    color: #1a1a1a;
  }
  .cert-no-box, .folio-box {
    border: 3px solid #666;
    padding: 10px 30px;
    font-size: 64px;
    color: #c0392b;
    font-weight: bold;
    min-width: 320px;
    text-align: center;
  }

  /* ── LOGO + COMPANY NAME ── */
  .header-center {
    text-align: center;
  }
  .header-center img.logo {
    height: 340px;
    object-fit: contain;
    display: inline-block;
  }
  .company-name {
    display: inline-block;
    vertical-align: middle;
    text-align: left;
    margin-left: 40px;
  }
  .company-name .line1 {
    font-size: 160px;
    font-weight: bold;
    color: #c0392b;
    line-height: 1.1;
  }
  .company-name .line2 {
    font-size: 80px;
    color: #333;
    font-style: italic;
  }
  .company-name .line3 {
    font-size: 160px;
    font-weight: bold;
    color: #1a5c1a;
    line-height: 1.1;
  }
  .tagline {
    font-size: 60px;
    color: #333;
    font-style: italic;
    text-align: center;
    margin-top: 10px;
  }

  /* ── CERT ID ── */
  .cert-id-bar {
    text-align: center;
    font-size: 72px;
    border: 3px solid #444;
    display: inline-block;
    padding: 12px 60px;
    margin: 0 auto;
    font-family: monospace;
    font-weight: bold;
    letter-spacing: 4px;
    color: #1a1a1a;
  }
  .cert-id-wrapper {
    text-align: center;
  }

  /* ── SHARE CERTIFICATE TITLE ── */
  .title-bar {
    display: flex;
    align-items: center;
    gap: 40px;
    justify-content: center;
  }
  .title-bar .deco {
    flex: 1;
    height: 6px;
    background: linear-gradient(to right, transparent, #b8860b, transparent);
  }
  .title-bar-box {
    background: #1a5c1a;
    color: #fff;
    font-size: 150px;
    font-weight: bold;
    letter-spacing: 12px;
    padding: 24px 80px;
    text-align: center;
    text-transform: uppercase;
    border: 4px solid #b8860b;
  }

  /* ── CERTIFY TEXT + QR ── */
  .certify-row {
    display: flex;
    align-items: flex-start;
    gap: 80px;
  }
  .certify-text {
    flex: 1;
    font-size: 74px;
    color: #1a1a1a;
    line-height: 1.8;
  }
  .certify-text .italic-intro {
    font-style: italic;
    font-size: 82px;
  }
  .certify-text .highlight {
    color: #c0392b;
    font-weight: bold;
  }
  .certify-text .highlight-green {
    color: #1a5c1a;
    font-weight: bold;
  }
  .qr-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }
  .qr-block img {
    width: 420px;
    height: 420px;
    object-fit: contain;
    border: 3px solid #ccc;
  }
  .qr-block .qr-label {
    font-size: 52px;
    color: #555;
    text-align: center;
  }
  .qr-block .qr-link {
    font-size: 56px;
    color: #1a5c1a;
    text-decoration: underline;
    text-align: center;
  }

  /* ── TWO COLUMN LAYOUT ── */
  .two-col {
    display: flex;
    gap: 60px;
    align-items: flex-start;
  }
  .left-col { flex: 1.1; }
  .right-col { flex: 1; }

  /* ── INFO TABLE ── */
  .info-table {
    border: 3px solid #888;
    border-radius: 8px;
    overflow: hidden;
    font-size: 68px;
    color: #1a1a1a;
    width: 100%;
  }
  .info-table .row {
    display: flex;
    align-items: flex-start;
    padding: 18px 30px;
    border-bottom: 2px solid #ccc;
    line-height: 1.5;
  }
  .info-table .row:last-child { border-bottom: none; }
  .info-table .row .icon {
    width: 80px;
    font-size: 70px;
    flex-shrink: 0;
  }
  .info-table .row .label {
    width: 540px;
    color: #333;
    flex-shrink: 0;
  }
  .info-table .row .sep {
    margin: 0 20px;
    color: #888;
    flex-shrink: 0;
  }
  .info-table .row .val {
    color: #c0392b;
    font-weight: 600;
    flex: 1;
  }

  /* ── SHARE DETAILS TABLE ── */
  .share-table {
    border: 3px solid #888;
    border-radius: 8px;
    overflow: hidden;
    font-size: 68px;
    color: #1a1a1a;
    width: 100%;
    margin-top: 0;
  }
  .share-table .row {
    display: flex;
    align-items: flex-start;
    padding: 18px 30px;
    border-bottom: 2px solid #ccc;
    line-height: 1.5;
  }
  .share-table .row:last-child { border-bottom: none; }
  .share-table .row .icon {
    width: 80px;
    font-size: 70px;
    flex-shrink: 0;
  }
  .share-table .row .label {
    width: 700px;
    color: #333;
    flex-shrink: 0;
  }
  .share-table .row .sep {
    margin: 0 20px;
    color: #888;
    flex-shrink: 0;
  }
  .share-table .row .val {
    color: #1a1a1a;
    font-weight: 600;
    flex: 1;
  }

  /* ── CAPITAL STRUCTURE ── */
  .capital-section {
    margin-top: 40px;
  }
  .capital-title {
    text-align: center;
    font-size: 70px;
    font-weight: bold;
    color: #1a5c1a;
    border: 3px solid #1a5c1a;
    padding: 14px 60px;
    display: inline-block;
    letter-spacing: 6px;
    margin-bottom: 20px;
  }
  .capital-title-wrapper { text-align: center; }
  .capital-grid {
    display: flex;
    border: 3px solid #888;
    border-radius: 8px;
    overflow: hidden;
  }
  .cap-col {
    flex: 1;
    padding: 28px 30px;
    text-align: center;
    font-size: 66px;
    border-right: 2px solid #ccc;
    line-height: 1.7;
  }
  .cap-col:last-child { border-right: none; }
  .cap-col .cap-head { font-weight: bold; color: #1a1a1a; }
  .cap-col .cap-amt { font-weight: bold; color: #1a5c1a; font-size: 72px; }
  .cap-col .cap-sub { color: #555; font-size: 58px; }

  /* ── OFFICE / CONTACT ── */
  .offices-row {
    display: flex;
    gap: 40px;
    font-size: 62px;
    color: #1a1a1a;
    line-height: 1.7;
  }
  .office-box {
    flex: 1;
    border: 2px solid #ccc;
    border-radius: 8px;
    padding: 20px 28px;
  }
  .office-box .off-title { font-weight: bold; color: #1a1a1a; font-size: 68px; }
  .contact-box {
    flex: 0.7;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 14px;
    font-size: 62px;
    padding: 20px 28px;
    border: 2px solid #ccc;
    border-radius: 8px;
  }
  .contact-box .c-row { display: flex; align-items: center; gap: 16px; }

  /* ── TRANSFER BUTTON ── */
  .transfer-btn {
    background: #1a5c1a;
    color: #fff;
    font-size: 80px;
    font-weight: bold;
    padding: 24px 60px;
    border-radius: 8px;
    display: inline-flex;
    align-items: center;
    gap: 20px;
    float: right;
    margin-top: 10px;
  }

  /* ── FOOTER BANNER ── */
  .footer-banner {
    background: #1a5c1a;
    color: #fff;
    font-size: 66px;
    text-align: center;
    padding: 28px 60px;
    border-radius: 8px;
    line-height: 1.6;
    display: flex;
    align-items: center;
    gap: 30px;
    justify-content: center;
  }
  .footer-banner .lock-icon {
    font-size: 80px;
    flex-shrink: 0;
  }
  `;
}

function buildHtml(c: CertData): string {
  const bgUrl   = toDataUrl("Gemini_Generated_Image_28ruh128ruh128ru.png");
  const logoUrl = toDataUrl("sea-maiden.png");

  const buyer    = c.purchaseId?.buyerInfo ?? c.userId;
  const share    = c.projectId;
  const purchase = c.purchaseId;
  const isIssued = c.status === "issued";
  const fmt      = (n: number) => Number(n).toLocaleString("en-BD");
  const fmtDate  = (d?: Date | string) => d ? new Date(d).toLocaleDateString("en-GB", { day:"2-digit", month:"2-digit", year:"numeric" }) : "—";

  const qty       = purchase?.quantity ?? 1;
  const shareQty  = qty;
  const shareWords = numberToWords(shareQty);
  const totalAmt  = c.totalPayable;
  const certNo    = `C-${c._id.toString().slice(-6).toUpperCase()}/2026`;

  const fromShare = c.shareNumbers?.[0] ?? "—";
  const toShare   = c.shareNumbers?.[c.shareNumbers.length - 1] ?? "—";
  const issueDate = c.issuedAt ? fmtDate(c.issuedAt) : (isIssued ? fmtDate(new Date()) : "Pending");

  const buyerName    = buyer?.name ?? "—";
  const fatherName   = buyer?.fatherName ?? "—";
  const address      = buyer?.address ?? ([buyer?.upazila, buyer?.district].filter(Boolean).join(", ") || "—");
  const nid          = buyer?.nid ?? "—";
  const mobile       = buyer?.phone ?? "—";
  const email        = buyer?.email ?? "—";
  const customerId   = buyer?.customerId ?? c._id.toString().slice(-8).toUpperCase();

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
${getCss(bgUrl)}
</style>
</head>
<body>
<div class="page">

  <!-- TOP BAR: cert no / logo+name / folio -->
  <div class="top-bar">
    <div>Certificate No. : <span class="cert-no-box">${certNo}</span></div>
    <div style="display:flex;align-items:center;gap:40px;">
      <img src="${logoUrl}" class="logo" style="height:280px;object-fit:contain;" alt="logo"/>
      <div class="company-name">
        <div class="line1">Alahee Developers</div>
        <div class="line2">&mdash;&nbsp;&amp;&nbsp;&mdash;</div>
        <div class="line3">Property Bazar Ltd.</div>
      </div>
    </div>
    <div>Folio No. : <span class="folio-box">${customerId}</span></div>
  </div>

  <!-- TAGLINE -->
  <div style="text-align:center;font-size:62px;color:#333;font-style:italic;margin-top:-30px;">
    &mdash; Base of the best future &mdash;
  </div>

  <!-- CERT ID -->
  <div class="cert-id-wrapper">
    <span class="cert-id-bar">${certNo}</span>
  </div>

  <!-- TITLE -->
  <div class="title-bar">
    <div class="deco"></div>
    <div class="title-bar-box">SHARE&nbsp;&nbsp;CERTIFICATE</div>
    <div class="deco"></div>
  </div>

  <!-- CERTIFY ROW: left (certify text) + right (qr) inside two-col -->
  <div class="two-col" style="align-items:flex-start;">

    <!-- LEFT: shareholder info table -->
    <div class="left-col">
      <div class="info-table">
        <div class="row"><span class="icon">👤</span><span class="label">Name of Shareholder</span><span class="sep">:</span><span class="val">${buyerName}</span></div>
        <div class="row"><span class="icon">👥</span><span class="label">S/O, D/O, W/O</span><span class="sep">:</span><span class="val">${fatherName}</span></div>
        <div class="row"><span class="icon">📍</span><span class="label">Address</span><span class="sep">:</span><span class="val">${address}</span></div>
        <div class="row"><span class="icon">🪪</span><span class="label">NID / Passport No.</span><span class="sep">:</span><span class="val">${nid}</span></div>
        <div class="row"><span class="icon">📞</span><span class="label">Mobile No.</span><span class="sep">:</span><span class="val">${mobile}</span></div>
        <div class="row"><span class="icon">✉️</span><span class="label">Email</span><span class="sep">:</span><span class="val">${email}</span></div>
        <div class="row"><span class="icon">🔖</span><span class="label">Customer ID</span><span class="sep">:</span><span class="val">${customerId}</span></div>
      </div>

      <!-- Share details table below -->
      <div style="margin-top:40px;">
        <div class="share-table">
          <div class="row"><span class="icon">📋</span><span class="label">Share Number (Distinctive Nos.)</span><span class="sep">:</span><span class="val">From <b style="color:#c0392b">${fromShare}</b> To <b style="color:#c0392b">${toShare}</b></span></div>
          <div class="row"><span class="icon">💰</span><span class="label">Face Value Per Share</span><span class="sep">:</span><span class="val">Tk. 100/- (Taka One Hundred Only)</span></div>
          <div class="row"><span class="icon">📊</span><span class="label">Number of Shares</span><span class="sep">:</span><span class="val"><b style="color:#c0392b">${shareQty}</b> Shares</span></div>
          <div class="row"><span class="icon">💵</span><span class="label">Total Amount</span><span class="sep">:</span><span class="val">Tk. <b style="color:#c0392b">${fmt(totalAmt)}</b>/-</span></div>
          <div class="row"><span class="icon">🏷️</span><span class="label">Share Class</span><span class="sep">:</span><span class="val">Ordinary Share</span></div>
          <div class="row"><span class="icon">📅</span><span class="label">Issue Date</span><span class="sep">:</span><span class="val"><b style="color:#c0392b">${issueDate}</b></span></div>
        </div>
      </div>
    </div>

    <!-- RIGHT: certify text + QR -->
    <div class="right-col">
      <div class="certify-text">
        <p class="italic-intro">This is to Certify that</p>
        <p style="margin-top:30px;">
          is the Registered Shareholder of <span class="highlight">${shareQty}</span>
          ( <span class="highlight">${shareWords}</span> )
        </p>
        <p>Ordinary Shares of Tk. 100/- (Taka One Hundred) each in</p>
        <p style="margin-top:20px;">
          <span class="highlight-green">Alahee Developers &amp; Property Bazar Ltd.</span> subject to
        </p>
        <p>the Memorandum and Articles of Association of the Company.</p>
      </div>

      <!-- QR placeholder (no actual QR lib, show box) -->
      <div class="qr-block" style="margin-top:50px;">
        <div style="width:420px;height:420px;border:4px solid #ccc;display:flex;align-items:center;justify-content:center;font-size:52px;color:#999;text-align:center;background:#f9f9f9;">
          QR Code<br/>Verification
        </div>
        <div class="qr-label">Scan to verify this certificate</div>
        <div class="qr-link">www.alaheebd.com/verify</div>
      </div>

      <!-- Capital Structure -->
      <div class="capital-section">
        <div class="capital-title-wrapper">
          <span class="capital-title">CAPITAL STRUCTURE</span>
        </div>
        <div class="capital-grid">
          <div class="cap-col">
            <div class="cap-head">Authorized Capital</div>
            <div class="cap-amt">Tk. 1,00,00,000/-</div>
            <div class="cap-sub">(One Crore Taka Only)</div>
          </div>
          <div class="cap-col">
            <div class="cap-head">Paid-up Capital</div>
            <div class="cap-amt">Tk. 30,00,000/-</div>
            <div class="cap-sub">(Thirty Lakh Taka Only)</div>
          </div>
          <div class="cap-col">
            <div class="cap-head">Total Authorized Shares</div>
            <div class="cap-amt">100,000 (One Lakh)</div>
            <div class="cap-sub">Ordinary Shares</div>
          </div>
        </div>
      </div>

      <!-- Offices + Transfer -->
      <div style="margin-top:40px;">
        <div class="offices-row">
          <div class="office-box">
            <div class="off-title">📍 Paltan Office:</div>
            <div>Plate-D (12th Floor)</div>
            <div>Faenaj Tower, 37/2 Purana Paltan</div>
            <div>Culvert Road, Dhaka-1000.</div>
          </div>
          <div class="office-box">
            <div class="off-title">📍 Mirpur Office:</div>
            <div>House-25 (Ground Floor),</div>
            <div>Opposite Orchid Community Centre</div>
            <div>Avenue-5, Section-6, Mirpur, Dhaka-1216.</div>
          </div>
          <div class="contact-box">
            <div class="c-row">📞 +88 09611243933</div>
            <div class="c-row">✉️ alahee2021@gmail.com</div>
            <div class="c-row">🌐 www.alaheebd.com</div>
          </div>
        </div>
        <div style="text-align:right;margin-top:30px;">
          <span class="transfer-btn">Transfer To &#8644;</span>
        </div>
      </div>
    </div>
  </div>

  <!-- FOOTER BANNER -->
  <div class="footer-banner">
    <span class="lock-icon">🔒</span>
    <span>
      This is a computer-generated digital share certificate. Digital signature and company seal are embedded<br/>
      in the QR verification system. No physical seal or handwritten signature is required.
    </span>
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
    await page.setViewport({ width: 4961, height: 3508, deviceScaleFactor: 1 });
    await page.setContent(buildHtml(c), { waitUntil: "networkidle0" });
    const screenshot = await page.screenshot({
      type: "png",
      clip: { x: 0, y: 0, width: 4961, height: 3508 },
    });
    return Buffer.from(screenshot);
  } finally {
    await browser.close();
  }
}
