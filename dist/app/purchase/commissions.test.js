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
Object.defineProperty(exports, "__esModule", { value: true });
const commissions_1 = require("./commissions");
const model_1 = require("./model");
const model_2 = require("../wallet/model");
const model_3 = require("../user/model");
const model_4 = require("../settings/model");
const controller_1 = require("../rank/controller");
jest.mock("./model");
jest.mock("../wallet/model");
jest.mock("../user/model");
jest.mock("../settings/model");
jest.mock("../rank/controller");
const mockPurchase = (overrides = {}) => (Object.assign({ _id: "purchase1", userId: "buyer1", paymentType: "cash", quantity: 1, commissionProcessed: false, shareId: {
        cashPrice: 100000,
        directSalesCommissionForCashSell: 10,
        directSalesCommissionForInstallmentSell: 5,
        managerialCommissionForCashSell: 10,
        managerialCommissionForInstallmentSell: 5,
        installment: { downPayment: 20000 },
    }, save: jest.fn() }, overrides));
const mockWallet = (balance = 0) => ({
    balance,
    pendingManagerialCommissionBalance: 0,
    save: jest.fn(),
});
beforeEach(() => {
    jest.clearAllMocks();
    controller_1.recalcUserRank.mockResolvedValue(undefined);
    model_2.TransactionLog.create.mockResolvedValue({});
    model_3.User.findByIdAndUpdate.mockResolvedValue({});
});
describe("distributeCommissions", () => {
    test("does nothing if purchase not found", () => __awaiter(void 0, void 0, void 0, function* () {
        model_1.Purchase.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
        yield (0, commissions_1.distributeCommissions)("purchase1");
        expect(model_2.Wallet.findOne).not.toHaveBeenCalled();
    }));
    test("does nothing if commissionProcessed is true", () => __awaiter(void 0, void 0, void 0, function* () {
        const purchase = mockPurchase({ commissionProcessed: true });
        model_1.Purchase.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(purchase) });
        yield (0, commissions_1.distributeCommissions)("purchase1");
        expect(model_2.Wallet.findOne).not.toHaveBeenCalled();
    }));
    test("does nothing if buyer not found", () => __awaiter(void 0, void 0, void 0, function* () {
        const purchase = mockPurchase();
        model_1.Purchase.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(purchase) });
        model_3.User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
        yield (0, commissions_1.distributeCommissions)("purchase1");
        expect(model_2.Wallet.findOne).not.toHaveBeenCalled();
    }));
    test("adds direct commission to referrer wallet on cash purchase", () => __awaiter(void 0, void 0, void 0, function* () {
        const purchase = mockPurchase();
        const wallet = mockWallet(0);
        model_1.Purchase.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(purchase) });
        model_3.User.findById.mockReturnValue({
            select: jest.fn().mockResolvedValue({ generationAncestors: [{ userId: "referrer1" }], placementAncestors: [] }),
        });
        model_4.Settings.findOne.mockResolvedValue({ maxGenerations: 0, generationCommission: [] });
        model_2.Wallet.findOne.mockResolvedValue(wallet);
        yield (0, commissions_1.distributeCommissions)("purchase1");
        // 10% of 100000 = 10000
        expect(wallet.balance).toBe(10000);
        expect(wallet.save).toHaveBeenCalled();
        expect(model_2.TransactionLog.create).toHaveBeenCalledWith(expect.objectContaining({ type: "direct_commission", amount: 10000 }));
    }));
    test("adds direct commission based on downPayment for installment purchase", () => __awaiter(void 0, void 0, void 0, function* () {
        const purchase = mockPurchase({ paymentType: "installment" });
        const wallet = mockWallet(0);
        model_1.Purchase.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(purchase) });
        model_3.User.findById.mockReturnValue({
            select: jest.fn().mockResolvedValue({ generationAncestors: [{ userId: "referrer1" }], placementAncestors: [] }),
        });
        model_4.Settings.findOne.mockResolvedValue({ maxGenerations: 0, generationCommission: [] });
        model_2.Wallet.findOne.mockResolvedValue(wallet);
        yield (0, commissions_1.distributeCommissions)("purchase1");
        // 5% of 20000 downPayment = 1000
        expect(wallet.balance).toBe(1000);
    }));
    test("skips direct commission if no referrer", () => __awaiter(void 0, void 0, void 0, function* () {
        const purchase = mockPurchase();
        model_1.Purchase.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(purchase) });
        model_3.User.findById.mockReturnValue({
            select: jest.fn().mockResolvedValue({ generationAncestors: [], placementAncestors: [] }),
        });
        model_4.Settings.findOne.mockResolvedValue({ maxGenerations: 0, generationCommission: [] });
        yield (0, commissions_1.distributeCommissions)("purchase1");
        expect(model_2.Wallet.findOne).not.toHaveBeenCalled();
    }));
    test("adds managerial commission to placement ancestors", () => __awaiter(void 0, void 0, void 0, function* () {
        const purchase = mockPurchase();
        const referrerWallet = mockWallet(0);
        const parentWallet = mockWallet(0);
        model_1.Purchase.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(purchase) });
        model_3.User.findById
            .mockReturnValueOnce({ select: jest.fn().mockResolvedValue({ generationAncestors: [{ userId: "referrer1" }], placementAncestors: [{ userId: "parent1", side: "A" }] }) }) // buyer
            .mockReturnValueOnce({ select: jest.fn().mockResolvedValue({ name: "Referrer", username: "referrer1" }) }) // referrer label
            .mockReturnValueOnce({ select: jest.fn().mockResolvedValue({ name: "Parent", username: "parent1", placementAncestors: [] }) }); // gen1 ancestor
        model_4.Settings.findOne.mockResolvedValue({
            maxGenerations: 1,
            generationCommission: [{ generation: 1, rate: 5 }],
        });
        model_2.Wallet.findOne
            .mockResolvedValueOnce(referrerWallet) // referrer direct commission
            .mockResolvedValueOnce(parentWallet); // gen1 managerial commission
        yield (0, commissions_1.distributeCommissions)("purchase1");
        // managerialPool = 10% of 100000 = 10000; gen1 = 5% of 10000 = 500
        expect(parentWallet.pendingManagerialCommissionBalance).toBe(500);
        expect(model_2.TransactionLog.create).toHaveBeenCalledWith(expect.objectContaining({ type: "managerial_commission", amount: 500 }));
    }));
    test("sets commissionProcessed to true after distribution", () => __awaiter(void 0, void 0, void 0, function* () {
        const purchase = mockPurchase();
        model_1.Purchase.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(purchase) });
        model_3.User.findById.mockReturnValue({
            select: jest.fn().mockResolvedValue({ generationAncestors: [], placementAncestors: [] }),
        });
        model_4.Settings.findOne.mockResolvedValue({ maxGenerations: 0, generationCommission: [] });
        yield (0, commissions_1.distributeCommissions)("purchase1");
        expect(purchase.commissionProcessed).toBe(true);
        expect(purchase.save).toHaveBeenCalled();
    }));
    test("does nothing if referrer wallet not found", () => __awaiter(void 0, void 0, void 0, function* () {
        const purchase = mockPurchase();
        model_1.Purchase.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(purchase) });
        model_3.User.findById
            .mockReturnValueOnce({ select: jest.fn().mockResolvedValue({ generationAncestors: [{ userId: "referrer1" }], placementAncestors: [] }) })
            .mockReturnValueOnce({ select: jest.fn().mockResolvedValue({ name: "Referrer", username: "referrer1" }) });
        model_4.Settings.findOne.mockResolvedValue({ maxGenerations: 0, generationCommission: [] });
        model_2.Wallet.findOne.mockResolvedValue(null);
        yield (0, commissions_1.distributeCommissions)("purchase1");
        expect(purchase.commissionProcessed).toBe(false);
    }));
    test("respects maxGenerations limit", () => __awaiter(void 0, void 0, void 0, function* () {
        const purchase = mockPurchase();
        const referrerWallet = mockWallet(0);
        const gen1Wallet = mockWallet(0);
        const gen2Wallet = mockWallet(0);
        model_1.Purchase.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(purchase) });
        model_3.User.findById
            .mockReturnValueOnce({ select: jest.fn().mockResolvedValue({ generationAncestors: [{ userId: "referrer1" }], placementAncestors: [{ userId: "gen1", side: "A" }] }) }) // buyer
            .mockReturnValueOnce({ select: jest.fn().mockResolvedValue({ name: "Referrer", username: "referrer1" }) }) // referrer label
            .mockReturnValueOnce({ select: jest.fn().mockResolvedValue({ name: "Gen1", username: "gen1", placementAncestors: [{ userId: "gen2", side: "B" }] }) }); // gen1 ancestor
        model_4.Settings.findOne.mockResolvedValue({
            maxGenerations: 1,
            generationCommission: [
                { generation: 1, rate: 5 },
                { generation: 2, rate: 5 },
            ],
        });
        model_2.Wallet.findOne
            .mockResolvedValueOnce(referrerWallet)
            .mockResolvedValueOnce(gen1Wallet)
            .mockResolvedValueOnce(gen2Wallet);
        yield (0, commissions_1.distributeCommissions)("purchase1");
        // gen2 wallet should NOT receive managerial commission (maxGenerations: 1)
        expect(gen2Wallet.pendingManagerialCommissionBalance).toBe(0);
    }));
});
