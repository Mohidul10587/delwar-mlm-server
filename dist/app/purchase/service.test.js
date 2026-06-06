"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const service_1 = require("./service");
describe("purchase service", () => {
    test("calculates total payable from share price and quantity", () => {
        expect((0, service_1.calculateTotalPayable)(100000, 2)).toBe(200000);
    });
    test("keeps certificate pending while status is pending", () => {
        expect((0, service_1.calculateCertificateStatus)({
            status: "pending",
            paymentType: "cash",
            amountPaid: 100000,
            totalPayable: 100000,
        })).toBe("pending");
    });
    test("issues certificate for approved cash purchase", () => {
        expect((0, service_1.calculateCertificateStatus)({
            status: "approved",
            paymentType: "cash",
            amountPaid: 100000,
            totalPayable: 100000,
        })).toBe("issued");
    });
    test("keeps installment certificate pending before full payment", () => {
        expect((0, service_1.calculateCertificateStatus)({
            status: "approved",
            paymentType: "installment",
            amountPaid: 20000,
            totalPayable: 100000,
        })).toBe("pending");
    });
    test("issues installment certificate after full payment", () => {
        expect((0, service_1.calculateCertificateStatus)({
            status: "approved",
            paymentType: "installment",
            amountPaid: 100000,
            totalPayable: 100000,
        })).toBe("issued");
    });
});
