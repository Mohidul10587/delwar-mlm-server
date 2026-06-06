import { calculateCertificateStatus, calculateTotalPayable } from "./service";

describe("purchase service", () => {
  test("calculates total payable from share price and quantity", () => {
    expect(calculateTotalPayable(100000, 2)).toBe(200000);
  });

  test("keeps certificate pending while status is pending", () => {
    expect(
      calculateCertificateStatus({
        status: "pending",
        paymentType: "cash",
        amountPaid: 100000,
        totalPayable: 100000,
      })
    ).toBe("pending");
  });

  test("issues certificate for approved cash purchase", () => {
    expect(
      calculateCertificateStatus({
        status: "approved",
        paymentType: "cash",
        amountPaid: 100000,
        totalPayable: 100000,
      })
    ).toBe("issued");
  });

  test("keeps installment certificate pending before full payment", () => {
    expect(
      calculateCertificateStatus({
        status: "approved",
        paymentType: "installment",
        amountPaid: 20000,
        totalPayable: 100000,
      })
    ).toBe("pending");
  });

  test("issues installment certificate after full payment", () => {
    expect(
      calculateCertificateStatus({
        status: "approved",
        paymentType: "installment",
        amountPaid: 100000,
        totalPayable: 100000,
      })
    ).toBe("issued");
  });
});
