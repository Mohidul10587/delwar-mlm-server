"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildReceiptHtml = buildReceiptHtml;
exports.generateReceiptPng = generateReceiptPng;
const puppeteer_1 = __importDefault(require("puppeteer"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const publicDir = path_1.default.join(process.cwd(), "public");
function toDataUrl(filename) {
    const filePath = path_1.default.join(publicDir, filename);
    const ext = path_1.default.extname(filename).slice(1).replace("jpg", "jpeg");
    const data = fs_1.default.readFileSync(filePath).toString("base64");
    return `data:image/${ext};base64,${data}`;
}
// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt(n) {
    return "৳" + Number(n).toLocaleString("en-BD");
}
function fmtDate(d) {
    if (!d)
        return "—";
    return new Date(d).toLocaleDateString("en-BD", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}
function receiptNo(id, prefix = "RCP") {
    return prefix + "-" + id.slice(-8).toUpperCase();
}
function staffName(rb) {
    var _a, _b;
    if (!rb)
        return "—";
    if (typeof rb === "string")
        return rb;
    return (_b = (_a = rb.name) !== null && _a !== void 0 ? _a : rb.username) !== null && _b !== void 0 ? _b : "—";
}
function takaInWords(amount) {
    if (amount === 0)
        return "Zero Taka Only";
    const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
        "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    function convert(n) {
        if (n < 20)
            return ones[n];
        if (n < 100)
            return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
        if (n < 1000)
            return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convert(n % 100) : "");
        if (n < 100000)
            return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + convert(n % 1000) : "");
        if (n < 10000000)
            return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + convert(n % 100000) : "");
        return convert(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + convert(n % 10000000) : "");
    }
    return convert(Math.floor(amount)) + " Taka Only";
}
// ── HTML Builder ───────────────────────────────────────────────────────────────
// Mirrors ReceiptBody component in PaymentReceipt.tsx exactly (914×613 canvas)
function buildReceiptHtml(data) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w;
    const bgUrl = toDataUrl("money-recive-bg.jpeg");
    const { purchase, installment, shareNumbers } = data;
    const shareTitle = (_d = (_b = (_a = purchase.snapshot) === null || _a === void 0 ? void 0 : _a.shareTitle) !== null && _b !== void 0 ? _b : (_c = purchase.projectId) === null || _c === void 0 ? void 0 : _c.title) !== null && _d !== void 0 ? _d : "—";
    const cashPrice = (_h = (_f = (_e = purchase.snapshot) === null || _e === void 0 ? void 0 : _e.cashPrice) !== null && _f !== void 0 ? _f : (_g = purchase.projectId) === null || _g === void 0 ? void 0 : _g.cashPrice) !== null && _h !== void 0 ? _h : 0;
    const totalPayable = cashPrice * purchase.quantity;
    const buyerName = (_m = (_k = (_j = purchase.buyerInfo) === null || _j === void 0 ? void 0 : _j.name) !== null && _k !== void 0 ? _k : (_l = purchase.userId) === null || _l === void 0 ? void 0 : _l.name) !== null && _m !== void 0 ? _m : "—";
    const buyerPhone = (_r = (_p = (_o = purchase.buyerInfo) === null || _o === void 0 ? void 0 : _o.phone) !== null && _p !== void 0 ? _p : (_q = purchase.userId) === null || _q === void 0 ? void 0 : _q.phone) !== null && _r !== void 0 ? _r : "—";
    const buyerCustomerId = (_t = (_s = purchase.userId) === null || _s === void 0 ? void 0 : _s.customerId) !== null && _t !== void 0 ? _t : "—";
    const nominees = (() => {
        var _a, _b, _c, _d, _e, _f;
        if ((_b = (_a = purchase.buyerInfo) === null || _a === void 0 ? void 0 : _a.nominees) === null || _b === void 0 ? void 0 : _b.length)
            return purchase.buyerInfo.nominees;
        const list = [];
        if ((_d = (_c = purchase.buyerInfo) === null || _c === void 0 ? void 0 : _c.nominee) === null || _d === void 0 ? void 0 : _d.name)
            list.push(purchase.buyerInfo.nominee);
        if ((_f = (_e = purchase.buyerInfo) === null || _e === void 0 ? void 0 : _e.nominee2) === null || _f === void 0 ? void 0 : _f.name)
            list.push(purchase.buyerInfo.nominee2);
        return list;
    })();
    const isInstallmentReceipt = !!installment;
    const isCash = purchase.paymentType === "cash";
    const thisPaidAmount = isInstallmentReceipt ? installment.amount : purchase.downPayment;
    const txId = isInstallmentReceipt ? installment.transactionId : purchase.transactionId;
    const senderAcc = isInstallmentReceipt ? installment.senderAccount : purchase.senderAccount;
    const paymentDate = isInstallmentReceipt
        ? ((_u = installment.reviewedAt) !== null && _u !== void 0 ? _u : installment.createdAt)
        : ((_v = purchase.reviewedAt) !== null && _v !== void 0 ? _v : purchase.createdAt);
    const paymentId = isInstallmentReceipt ? installment.paymentId : purchase.paymentId;
    const installmentNo = isInstallmentReceipt ? installment.installmentNo : isCash ? "—" : "Down Payment";
    const rNo = isInstallmentReceipt
        ? receiptNo(installment._id, "INST")
        : receiptNo(purchase._id, "PUR");
    const shareNoDisplay = (_w = shareNumbers === null || shareNumbers === void 0 ? void 0 : shareNumbers.join(", ")) !== null && _w !== void 0 ? _w : "—";
    const isMobileBanking = !isCash && !!txId;
    const purpose = isInstallmentReceipt
        ? `Installment #${installment.installmentNo} for ${shareTitle}`
        : isCash
            ? `Full Cash Payment for ${shareTitle}`
            : `Down Payment for ${shareTitle}`;
    const soDo = nominees.length > 0
        ? nominees.map((n) => `${n.name}${n.relation ? ` (${n.relation})` : ""}`).join(", ")
        : "—";
    const dark = "#1a1a2e";
    const blue = "#1a3a8f";
    // Canvas: 914×613 (same as React component)
    const W = 914;
    const H = 613;
    const metaRows = [
        { label: "Receipt No.", value: rNo },
        { label: "Date", value: fmtDate(paymentDate) },
        { label: "Customer ID", value: buyerCustomerId },
        { label: "Share No. / Product Code", value: shareNoDisplay },
        { label: "Installment No.", value: String(installmentNo) },
    ];
    const metaHtml = metaRows.map(({ label, value }) => `
    <div style="display:flex;align-items:baseline;gap:4px;font-size:12px;font-weight:700;color:${dark};">
      <span style="min-width:148px;font-weight:600;">${label}</span>
      <span>:</span>
      <span style="font-family:monospace;">${value}</span>
    </div>`).join("");
    const checkBox = (checked) => `<span style="display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border:1.5px solid #333;font-size:10px;color:${blue};font-weight:900;background:rgba(255,255,255,0.6);">${checked ? "✓" : ""}</span>`;
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { width:${W}px; height:${H}px; overflow:hidden; }
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
        : `<span style="margin-left:8px;color:#555;font-weight:400;">Transaction ID / Reference No. ………………………………………………</span>`}
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
function generateReceiptPng(data) {
    return __awaiter(this, void 0, void 0, function* () {
        const browser = yield puppeteer_1.default.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
        });
        try {
            const page = yield browser.newPage();
            yield page.setViewport({ width: 914, height: 613, deviceScaleFactor: 1 });
            yield page.setContent(buildReceiptHtml(data), { waitUntil: "networkidle0" });
            const screenshot = yield page.screenshot({
                type: "png",
                clip: { x: 0, y: 0, width: 914, height: 613 },
            });
            return Buffer.from(screenshot);
        }
        finally {
            yield browser.close();
        }
    });
}
