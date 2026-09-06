import type { PaymentType, PurchaseStatus } from "./model";

export type CertificateStatus = "pending" | "issued";

export function calculateTotalPayable(cashPrice: number, quantity: number): number {
  return cashPrice * quantity;
}

/**
 * Calculates totalPayable from a purchase record, correctly using
 * installmentPrice (from snapshot) for installment purchases and
 * cashPrice for cash purchases.
 *
 * For cash purchases: the buyer paid the discounted full price upfront.
 * amountPaid already reflects that discounted total, so we use it directly
 * as totalPayable — remaining will always be 0 for approved cash purchases.
 *
 * For installment purchases: installmentPrice × qty is the correct total.
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
    // Cash purchase: buyer paid the discounted full price at submission time.
    // amountPaid is that exact amount, so use it as the total to ensure remaining = 0.
    if (purchase.amountPaid != null && purchase.amountPaid > 0) {
      return purchase.amountPaid;
    }
    // Fallback (e.g. legacy records before this fix)
    return (purchase.snapshot?.cashPrice ?? Number((purchase.projectId as any)?.cashPrice ?? 0)) * qty;
  }
  // Installment purchase: use installmentPrice from snapshot
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
