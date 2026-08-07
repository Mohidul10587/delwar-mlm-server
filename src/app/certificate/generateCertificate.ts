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

function buildHtml(c: CertData): string {
  const bgUrl = toDataUrl("Gemini_Generated_Image_28ruh128ruh128ru.png");

  const buyer    = c.purchaseId?.buyerInfo ?? c.userId;
  const isIssued = c.status === "issued";
  const fmt      = (n: number) => Number(n).toLocaleString("en-BD");
  const fmtDate  = (d?: Date | string) =>
    d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

  const qty        = c.purchaseId?.quantity ?? 1;
  const shareWords = numberToWords(qty);
  const totalAmt   = c.totalPayable;
  const certNo     = `C-${c._id.toString().slice(-6).toUpperCase()}/2026`;
  const fromShare  = c.shareNumbers?.[0] ?? "—";
  const toShare    = c.shareNumbers?.[c.shareNumbers.length - 1] ?? "—";
  const issueDate  = c.issuedAt ? fmtDate(c.issuedAt) : (isIssued ? fmtDate(new Date()) : "Pending");

  const buyerName  = buyer?.name ?? "—";
  const fatherName = buyer?.fatherName ?? "—";
  const address    = buyer?.address ?? ([buyer?.upazila, buyer?.district].filter(Boolean).join(", ") || "—");
  const nid        = buyer?.nid ?? "—";
  const mobile     = buyer?.phone ?? "—";
  const email      = buyer?.email ?? "—";
  const customerId = buyer?.customerId ?? c._id.toString().slice(-12).toUpperCase();

  const shareNumberHtml = c.shareNumbers?.length === 1
    ? `<span style="color:#c0392b;font-weight:600;">${fromShare}</span>`
    : `From <span style="color:#c0392b;font-weight:600;">${fromShare}</span> To <span style="color:#c0392b;font-weight:600;">${toShare}</span>`;

  // Mirrors the React <Row> component exactly:
  // icon(90px) | label(labelW) | :(sep) | value
  const row = (iconSvg: string, label: string, labelW: number, valueHtml: string, noBorder = false) => `
    <div style="display:flex;align-items:flex-start;padding:20px 28px;${noBorder ? "" : "border-bottom:2px solid #ccc;"}font-size:58px;">
      <span style="margin-top:16px;width:90px;flex-shrink:0;display:flex;align-items:center;justify-content:center;">${iconSvg}</span>
      <span style="width:${labelW}px;color:#333;flex-shrink:0;">${label}</span>
      <span style="margin:0 20px;color:#888;flex-shrink:0;">:</span>
      <span style="color:#c0392b;font-weight:600;flex:1;">${valueHtml}</span>
    </div>`;

  // SVG icons matching lucide icons used in frontend (color #1a5c1a, size 64)
  const iconPerson = `<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#1a5c1a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
  const iconPeople = `<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#1a5c1a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
  const iconPin    = `<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#1a5c1a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`;
  const iconId     = `<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#1a5c1a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>`;
  const iconPhone  = `<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#1a5c1a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.37 2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.77a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;
  const iconEmail  = `<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#1a5c1a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`;
  const iconShare  = `<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#1a5c1a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="9" y1="22" x2="15" y2="22"/></svg>`;
  const iconFace   = `<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#1a5c1a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`;
  const iconCount  = `<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#1a5c1a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`;
  const iconTotal  = `<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#1a5c1a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`;
  const iconClass  = `<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#1a5c1a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
  const iconCal    = `<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#1a5c1a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { width:4961px; height:3508px; font-family:'Georgia',serif; line-height:1.7; overflow:hidden; }
</style>
</head>
<body>

<!-- Root div: mirrors frontend CertificatePreview root -->
<div style="width:4961px;height:3508px;position:relative;font-family:'Georgia',serif;line-height:1.7;background-image:url('${bgUrl}');background-size:100% 100%;background-repeat:no-repeat;">

  <!-- Inner absolute layer: padding 160px 220px 140px, flex-col, gap 50 -->
  <div style="position:absolute;inset:0;padding:160px 220px 140px 220px;display:flex;flex-direction:column;gap:50px;">

    <!-- TOP BAR: margin-top 150, padding 0 60px, font-size 68, justify space-between -->
    <div style="display:flex;align-items:center;justify-content:space-between;font-size:68px;color:#1a1a1a;margin-top:150px;padding:0 60px;">
      <div>
        Certificate No. :&nbsp;
        <span style="border:3px solid #666;padding:10px 30px;font-size:64px;color:#c0392b;font-weight:bold;border-radius:28px;">${certNo}</span>
      </div>
      <div>
        Folio No. :&nbsp;
        <span style="border:3px solid #666;padding:10px 30px;font-size:64px;color:#c0392b;font-weight:bold;border-radius:28px;">${customerId}</span>
      </div>
    </div>

    <!-- CERT ID BAR: text-align center, margin-top 280 on span -->
    <div style="text-align:center;">
      <span style="border:3px solid #444;display:inline-block;padding:0px 60px;font-family:monospace;font-weight:bold;font-size:62px;letter-spacing:4px;color:#1a1a1a;margin-top:280px;border-radius:28px;">${certNo}</span>
    </div>

    <!-- TWO COLUMN BODY: gap 60, margin-top 250 -->
    <div style="display:flex;gap:60px;align-items:flex-start;margin-top:250px;">

      <!-- LEFT COLUMN: flex 0.75 -->
      <div style="flex:0.75;">

        <!-- Shareholder info table: border 3px #888, border-radius 28, overflow hidden, font-size 38 -->
        <div style="border:3px solid #888;border-radius:28px;overflow:hidden;font-size:38px;">
          ${row(iconPerson, "Name of Shareholder", 540, buyerName)}
          ${row(iconPeople, "S/O, D/O, W/O",       540, fatherName)}
          ${row(iconPin,    "Address",              540, address)}
          ${row(iconId,     "NID / Passport No.",   540, nid)}
          ${row(iconPhone,  "Mobile No.",           540, mobile)}
          ${row(iconEmail,  "Email",                540, email, true)}
        </div>

        <!-- Share details table: border 3px #888, border-radius 28, margin-top 40 -->
        <div style="border:3px solid #888;border-radius:28px;overflow:hidden;margin-top:40px;">
          ${row(iconShare, "Share Number (Distinctive Nos.)", 700, shareNumberHtml)}
          ${row(iconFace,  "Face Value Per Share",            700, "Tk. 100/- (Taka One Hundred Only)")}
          ${row(iconCount, "Number of Shares",                700, `<span style="color:#c0392b;">${qty}</span> Shares`)}
          ${row(iconTotal, "Total Amount",                    700, `Tk. <span style="color:#c0392b;">${fmt(totalAmt)}</span>/-`)}
          ${row(iconClass, "Share Class",                     700, "Ordinary Share")}
          ${row(iconCal,   "Issue Date",                      700, issueDate, true)}
        </div>
      </div>

      <!-- RIGHT COLUMN: flex 1.25, flex-col, gap 50 -->
      <div style="flex:1.25;display:flex;flex-direction:column;gap:50px;">

        <!-- "This is to Certify that": font-style italic, font-size 68, font-weight bold -->
        <p style="font-style:italic;font-size:68px;font-weight:bold;color:#1a1a1a;">This is to Certify that</p>

        <!-- Certify text + QR row: display flex, gap 80px (tailwind gap-20) -->
        <div style="display:flex;gap:80px;">

          <!-- Certify text: font-size 58, line-height 1.8 -->
          <div style="font-size:58px;color:#1a1a1a;line-height:1.8;">
            <p style="margin-top:30px;">
              is the Registered Shareholder of
              <span style="color:#c0392b;font-weight:bold;">${qty}</span>
              &nbsp;(&nbsp;<span style="color:#c0392b;font-weight:bold;">${shareWords}</span>&nbsp;)
            </p>
            <p>Ordinary Shares of Tk. 100/- (Taka One Hundred) each in</p>
            <p style="font-weight:bold;">
              <span style="color:#c0392b;">Alahee </span>
              <span style="color:#1a5c1a;">Developers &amp; Property</span>
              <span style="color:#c0392b;"> Bazar Ltd.</span>
              subject to
            </p>
            <p>the Memorandum and Articles of Association of the Company.</p>
          </div>

          <!-- QR placeholder: 420x420, border 4px #ccc, bg #f9f9f9, border-radius 8 -->
          <div style="display:flex;flex-direction:column;align-items:center;gap:20px;">
            <div style="width:420px;height:420px;border:4px solid #ccc;display:flex;align-items:center;justify-content:center;font-size:52px;color:#999;text-align:center;background:#f9f9f9;border-radius:8px;">
              QR Code<br/>Verification
            </div>
            <div style="font-size:52px;color:#555;text-align:center;">Scan to verify this certificate</div>
            <div style="font-size:56px;color:#1a5c1a;text-decoration:underline;text-align:center;">www.alaheebd.com/verify</div>
          </div>
        </div>

        <!-- Capital Structure -->
        <div>
          <div style="text-align:center;margin-bottom:10px;">
            <span style="font-size:58px;font-weight:bold;color:white;background:#1a5c1a;border:3px solid #1a5c1a;padding:8px 60px;display:inline-block;letter-spacing:6px;border-radius:48px;">
              CAPITAL STRUCTURE
            </span>
          </div>
          <div style="display:flex;border:3px solid #888;border-radius:28px;overflow:hidden;font-size:58px;">
            <div style="flex:1;padding:28px 30px;text-align:center;font-size:58px;line-height:1.7;border-right:2px solid #ccc;">
              <div style="font-weight:bold;color:#1a1a1a;">Authorized Capital</div>
              <div style="font-weight:bold;color:#1a5c1a;font-size:58px;">Tk. 1,00,00,000/-</div>
              <div style="color:#555;font-size:58px;">(One Crore Taka Only)</div>
            </div>
            <div style="flex:1;padding:28px 30px;text-align:center;font-size:58px;line-height:1.7;border-right:2px solid #ccc;">
              <div style="font-weight:bold;color:#1a1a1a;">Paid-up Capital</div>
              <div style="font-weight:bold;color:#1a5c1a;font-size:58px;">Tk. 30,00,000/-</div>
              <div style="color:#555;font-size:58px;">(Thirty Lakh Taka Only)</div>
            </div>
            <div style="flex:1;padding:28px 30px;text-align:center;font-size:58px;line-height:1.7;">
              <div style="font-weight:bold;color:#1a1a1a;">Total Authorized Shares</div>
              <div style="font-weight:bold;color:#1a5c1a;font-size:58px;">100,000 (One Lakh)</div>
              <div style="color:#555;font-size:58px;">Ordinary Shares</div>
            </div>
          </div>
        </div>

        <!-- Offices + contact: display flex, gap 40, border 3px #888, border-radius 28 -->
        <div style="display:flex;gap:40px;font-size:58px;color:#1a1a1a;line-height:1.7;border:3px solid #888;border-radius:28px;">
          <div style="flex:0.9;border-radius:8px;padding:20px 28px;">
            <div style="font-weight:bold;font-size:58px;">Paltan Office:</div>
            <div>Plate-D (12th Floor)</div>
            <div>Faenaj Tower, 37/2 Purana Paltan</div>
            <div>Culvert Road, Dhaka-1000.</div>
          </div>
          <div style="flex:1.2;border-radius:8px;padding:20px 28px;">
            <div style="font-weight:bold;font-size:58px;">Mirpur Office:</div>
            <div>House-25 (Ground Floor),</div>
            <div>Opposite Orchid Community Centre</div>
            <div>Avenue-5, Section-6, Mirpur, Dhaka-1216.</div>
          </div>
          <div style="flex:0.8;border-radius:8px;padding:20px 28px;display:flex;flex-direction:column;justify-content:center;gap:14px;">
            <div style="display:flex;align-items:center;gap:16px;">
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.37 2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.77a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              +88 09611243933
            </div>
            <div style="display:flex;align-items:center;gap:16px;">
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              alahee2021@gmail.com
            </div>
            <div style="display:flex;align-items:center;gap:16px;">
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              www.alaheebd.com
            </div>
          </div>
        </div>

        <!-- Transfer To button: text-align right -->
        <div style="text-align:right;">
          <span style="background:#1a5c1a;color:#fff;font-size:58px;font-weight:bold;padding:24px 60px;border-radius:8px;display:inline-flex;align-items:center;gap:20px;">
            Transfer To &#8644;
          </span>
        </div>

      </div><!-- /right col -->
    </div><!-- /two col -->
  </div><!-- /inner -->
</div><!-- /root -->

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
