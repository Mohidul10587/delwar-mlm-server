import type { PaymentType, PurchaseStatus } from "./model";

export type CertificateStatus = "pending" | "issued";

export function calculateTotalPayable(cashPrice: number, quantity: number): number {
  return cashPrice * quantity;
}

export function calculateCertificateStatus(params: {
  status: PurchaseStatus;
  paymentType: PaymentType;
  amountPaid: number;
  totalPayable: number;
}): CertificateStatus {
  const { status, paymentType, amountPaid, totalPayable } = params;

  if (status !== "approved") return "pending";

  // For cash payments, approval means full payment is verified.
  if (paymentType === "cash") return "issued";

  // For installments, certificate is issued only after full payment.
  return amountPaid >= totalPayable ? "issued" : "pending";
}
