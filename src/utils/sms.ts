const MIMSMS_BASE = "https://api.mimsms.com";
const USERNAME = process.env.MIMSMS_USERNAME!;
const APIKEY = process.env.MIMSMS_APIKEY!;
const SENDER = process.env.MIMSMS_SENDER || "8809617611003";

export async function sendOtpSms(phone: string, otp: string): Promise<void> {
  const mobile = phone.startsWith("88") ? phone : `88${phone}`;
  const body = {
    UserName: USERNAME,
    Apikey: APIKEY,
    MobileNumber: mobile,
    CampaignId: "null",
    SenderName: SENDER,
    TransactionType: "T",
    Message: `Your OTP is: ${otp}. Valid for 5 minutes.`,
  };

  const res = await fetch(`${MIMSMS_BASE}/api/SmsSending/SMS`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (data.statusCode !== "200") {
    throw new Error(`SMS failed: ${data.responseResult}`);
  }
}
