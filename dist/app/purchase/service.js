"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateTotalPayable = calculateTotalPayable;
exports.calculateCertificateStatus = calculateCertificateStatus;
function calculateTotalPayable(cashPrice, quantity) {
    return cashPrice * quantity;
}
function calculateCertificateStatus(params) {
    const { status, paymentType, amountPaid, totalPayable } = params;
    if (status !== "approved")
        return "pending";
    // For cash payments, approval means full payment is verified.
    if (paymentType === "cash")
        return "issued";
    // For installments, certificate is issued only after full payment.
    return amountPaid >= totalPayable ? "issued" : "pending";
}
