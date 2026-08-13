const MIMSMS_BASE = "https://api.mimsms.com";
const USERNAME = process.env.MIMSMS_USERNAME!;
const APIKEY = process.env.MIMSMS_APIKEY!;
const SENDER = process.env.MIMSMS_SENDER || "8809617611003";

/**
 * Generic SMS sending function
 */
async function sendSms(phone: string, message: string): Promise<void> {
  const mobile = phone.startsWith("88") ? phone : `88${phone}`;
  const body = {
    UserName: USERNAME,
    Apikey: APIKEY,
    MobileNumber: mobile,
    CampaignId: "null",
    SenderName: SENDER,
    TransactionType: "T",
    Message: message,
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

/**
 * Send OTP SMS for verification
 */
export async function sendOtpSms(phone: string, otp: string): Promise<void> {
  const message = `Your OTP is: ${otp}. Valid for 5 minutes. Alahee Group.`;
  await sendSms(phone, message);
}

/**
 * Send registration credentials SMS
 */
export async function sendRegistrationSms(
  phone: string,
  username: string,
  password: string
): Promise<void> {
  const message = `Welcome to Alahee Group! Your account has been created. Username: ${username}, Password: ${password}. Please login and change your password. Alahee Group.`;
  await sendSms(phone, message);
}

/**
 * Send purchase approval SMS
 */
export async function sendPurchaseApprovalSms(
  phone: string,
  purchaseId: string,
  amount: number,
  productName: string
): Promise<void> {
  const message = `Your purchase (ID: ${purchaseId}) of ${productName} for ৳${amount.toLocaleString()} has been approved. Thank you! Alahee Group.`;
  await sendSms(phone, message);
}

/**
 * Send installment payment approval SMS
 */
export async function sendInstallmentApprovalSms(
  phone: string,
  amount: number,
  purchaseId: string
): Promise<void> {
  const message = `Your installment payment of ৳${amount.toLocaleString()} for purchase ${purchaseId} has been approved. Thank you! Alahee Group.`;
  await sendSms(phone, message);
}

/**
 * Send withdrawal approval SMS
 */
export async function sendWithdrawalApprovalSms(
  phone: string,
  amount: number,
  taxAmount: number,
  netAmount: number,
  method: string
): Promise<void> {
  const message = `Your withdrawal request of ৳${amount.toLocaleString()} has been approved. Tax: ৳${taxAmount.toLocaleString()}, Net Amount: ৳${netAmount.toLocaleString()} via ${method}. Alahee Group.`;
  await sendSms(phone, message);
}

/**
 * Send registration confirmation SMS (when password is not available)
 */
export async function sendRegistrationConfirmationSms(
  phone: string,
  username: string
): Promise<void> {
  const message = `Welcome to Alahee Group! Your account @${username} has been verified successfully. Please login with your registered credentials. Alahee Group.`;
  await sendSms(phone, message);
}
