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
exports.generateCertificatePng = generateCertificatePng;
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
function buildHtml(c) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
    const bgUrl = toDataUrl("certificate-bg.jpg");
    const logoUrl = toDataUrl("sea-maiden.png");
    const tuneUrl = toDataUrl("tune.png");
    const signUrl = toDataUrl("Sign (1).png");
    const buyer = (_b = (_a = c.purchaseId) === null || _a === void 0 ? void 0 : _a.buyerInfo) !== null && _b !== void 0 ? _b : c.userId;
    const share = c.shareId;
    const purchase = c.purchaseId;
    const isIssued = c.status === "issued";
    const fmt = (n) => Number(n).toLocaleString("en-BD");
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-BD") : "—";
    const isInstallment = (purchase === null || purchase === void 0 ? void 0 : purchase.paymentType) === "installment";
    const dp = ((_c = purchase === null || purchase === void 0 ? void 0 : purchase.downPayment) !== null && _c !== void 0 ? _c : 0) * ((_d = purchase === null || purchase === void 0 ? void 0 : purchase.quantity) !== null && _d !== void 0 ? _d : 1);
    const perInst = ((_e = purchase === null || purchase === void 0 ? void 0 : purchase.installmentAmount) !== null && _e !== void 0 ? _e : 0) * ((_f = purchase === null || purchase === void 0 ? void 0 : purchase.quantity) !== null && _f !== void 0 ? _f : 1);
    const totalInst = (_g = purchase === null || purchase === void 0 ? void 0 : purchase.installmentCount) !== null && _g !== void 0 ? _g : 0;
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
    This is to certify that <b>${(_h = buyer === null || buyer === void 0 ? void 0 : buyer.name) !== null && _h !== void 0 ? _h : "—"}</b>
    is a registered holder of <b>${(_j = purchase === null || purchase === void 0 ? void 0 : purchase.quantity) !== null && _j !== void 0 ? _j : "—"}</b> share(s) of
    <b>${share === null || share === void 0 ? void 0 : share.title}</b>, each valued at <b>৳${fmt((_k = share === null || share === void 0 ? void 0 : share.cashPrice) !== null && _k !== void 0 ? _k : 0)}</b>,
    totalling <b>৳${fmt(c.totalPayable)}</b>.
  </p>

  <p class="details">
    <span class="lbl">Payment Type: </span><b style="text-transform:capitalize">${(_l = purchase === null || purchase === void 0 ? void 0 : purchase.paymentType) !== null && _l !== void 0 ? _l : "—"}</b>
    <span class="dot">·</span>
    <span class="lbl">Amount Paid: </span><b>৳${fmt((_m = purchase === null || purchase === void 0 ? void 0 : purchase.amountPaid) !== null && _m !== void 0 ? _m : 0)}</b>
    ${c.amountRemaining > 0 ? `<span class="dot">·</span><span class="lbl">Remaining: </span><b>৳${fmt(c.amountRemaining)}</b>` : ""}
    <span class="dot">·</span>
    <span class="lbl">Purchase Date: </span><b>${fmtDate(purchase === null || purchase === void 0 ? void 0 : purchase.createdAt)}</b>
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

  ${((_o = c.shareNumbers) === null || _o === void 0 ? void 0 : _o.length) > 0 ? `
  <p class="shares">
    <span class="lbl">Assigned Share Numbers: </span>
    <span style="font-family:monospace;font-weight:600">${c.shareNumbers.join(", ")}</span>
  </p>` : ""}

  <div class="holder">
    The holder's personal details are as follows —
    ${(buyer === null || buyer === void 0 ? void 0 : buyer.phone) ? `<span class="lbl">Phone: </span><b>${buyer.phone}</b>; ` : ""}
    ${(buyer === null || buyer === void 0 ? void 0 : buyer.dateOfBirth) ? `<span class="lbl">Date of Birth: </span><b>${buyer.dateOfBirth}</b>; ` : ""}
    ${((buyer === null || buyer === void 0 ? void 0 : buyer.district) || (buyer === null || buyer === void 0 ? void 0 : buyer.upazila)) ? `<span class="lbl">Area: </span><b>${[buyer === null || buyer === void 0 ? void 0 : buyer.upazila, buyer === null || buyer === void 0 ? void 0 : buyer.district].filter(Boolean).join(", ")}</b>.` : ""}
    ${((_p = buyer === null || buyer === void 0 ? void 0 : buyer.nominee) === null || _p === void 0 ? void 0 : _p.name) ? ` In the event of the holder's demise, the nominee shall be <b>${buyer.nominee.name}</b> (<b>${buyer.nominee.relation}</b>, <b>${buyer.nominee.phone}</b>).` : ""}
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
function generateCertificatePng(c) {
    return __awaiter(this, void 0, void 0, function* () {
        const browser = yield puppeteer_1.default.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
        });
        try {
            const page = yield browser.newPage();
            yield page.setViewport({ width: 4961, height: 3093, deviceScaleFactor: 1 });
            yield page.setContent(buildHtml(c), { waitUntil: "networkidle0" });
            const screenshot = yield page.screenshot({
                type: "png",
                clip: { x: 0, y: 0, width: 4961, height: 3093 },
            });
            return Buffer.from(screenshot);
        }
        finally {
            yield browser.close();
        }
    });
}
