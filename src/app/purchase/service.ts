import type { PaymentType, PurchaseStatus } from "./model";

export type CertificateStatus = "pending" | "issued";

export function calculateTotalPayable(cashPrice: number, quantity: number): number {
  return cashPrice * quantity;
}

/**
 * Calculates totalPayable from a purchase record, correctly using
 * installmentPrice (from snapshot) for installment purchases and
 * the discounted cash total for cash purchases.
 *
 * For cash purchases: totalPayable = (discountedDP + remaining) × qty.
 * Since amountPaid is set to exactly this value at purchase creation,
 * we use amountPaid directly — it is always the authoritative figure.
 *
 * For installment purchases: installmentPrice × qty is the correct total.
 * The down payment is a partial payment; remaining is paid in kisti.
 */
export function calculateTotalPayableFromPurchase(purchase: {
  paymentType: PaymentType;
  quantity: number;
  amountPaid?: number;
  snapshot?: { cashPrice?: number; installmentPrice?: number };
  projectId?: any;
}): number {
  const qty = purchase.quantity;
  if (purchase.paymentType === "cash") {
    // amountPaid is the discounted full price set by the backend at purchase
    // creation time — it is the only correct source for cash totalPayable.
    if (purchase.amountPaid != null && purchase.amountPaid > 0) {
      return purchase.amountPaid;
    }
    // Fallback for legacy records created before amountPaid was set reliably
    return (purchase.snapshot?.cashPrice ?? Number((purchase.projectId as any)?.cashPrice ?? 0)) * qty;
  }
  // Installment: total is always installmentPrice × qty regardless of down payment
  const installmentPrice =
    purchase.snapshot?.installmentPrice ??
    purchase.snapshot?.cashPrice ??
    Number((purchase.projectId as any)?.cashPrice ?? 0);
  return installmentPrice * qty;
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
