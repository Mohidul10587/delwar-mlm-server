import { distributeCommissions } from "./commissions";
import { Purchase } from "./model";
import { Wallet, TransactionLog } from "../wallet/model";
import { User } from "../user/model";
import { Settings } from "../settings/model";
import { recalcUserRank } from "../rank/controller";

jest.mock("./model");
jest.mock("../wallet/model");
jest.mock("../user/model");
jest.mock("../settings/model");
jest.mock("../rank/controller");

const mockPurchase = (overrides = {}) => ({
  _id: "purchase1",
  userId: "buyer1",
  paymentType: "cash",
  quantity: 1,
  commissionProcessed: false,
  shareId: {
    cashPrice: 100000,
    directSalesCommissionForCashSell: 10,
    directSalesCommissionForInstallmentSell: 5,
    managerialCommissionForCashSell: 10,
    managerialCommissionForInstallmentSell: 5,
    installment: { downPayment: 20000 },
  },
  save: jest.fn(),
  ...overrides,
});

const mockWallet = (balance = 0) => ({
  balance,
  managerialCommissionBalance: 0,
  save: jest.fn(),
});

beforeEach(() => {
  jest.clearAllMocks();
  (recalcUserRank as jest.Mock).mockResolvedValue(undefined);
  (TransactionLog.create as jest.Mock).mockResolvedValue({});
  (User.findByIdAndUpdate as jest.Mock).mockResolvedValue({});
});

describe("distributeCommissions", () => {
  test("does nothing if purchase not found", async () => {
    (Purchase.findById as jest.Mock).mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
    await distributeCommissions("purchase1");
    expect(Wallet.findOne).not.toHaveBeenCalled();
  });

  test("does nothing if commissionProcessed is true", async () => {
    const purchase = mockPurchase({ commissionProcessed: true });
    (Purchase.findById as jest.Mock).mockReturnValue({ populate: jest.fn().mockResolvedValue(purchase) });
    await distributeCommissions("purchase1");
    expect(Wallet.findOne).not.toHaveBeenCalled();
  });

  test("does nothing if buyer not found", async () => {
    const purchase = mockPurchase();
    (Purchase.findById as jest.Mock).mockReturnValue({ populate: jest.fn().mockResolvedValue(purchase) });
    (User.findById as jest.Mock).mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    await distributeCommissions("purchase1");
    expect(Wallet.findOne).not.toHaveBeenCalled();
  });

  test("adds direct commission to referrer wallet on cash purchase", async () => {
    const purchase = mockPurchase();
    const wallet = mockWallet(0);

    (Purchase.findById as jest.Mock).mockReturnValue({ populate: jest.fn().mockResolvedValue(purchase) });
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({ generationAncestors: [{ userId: "referrer1" }], placementAncestors: [] }),
    });
    (Settings.findOne as jest.Mock).mockResolvedValue({ maxGenerations: 0, generationCommission: [] });
    (Wallet.findOne as jest.Mock).mockResolvedValue(wallet);

    await distributeCommissions("purchase1");

    // 10% of 100000 = 10000
    expect(wallet.balance).toBe(10000);
    expect(wallet.save).toHaveBeenCalled();
    expect(TransactionLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: "direct_commission", amount: 10000 })
    );
  });

  test("adds direct commission based on downPayment for installment purchase", async () => {
    const purchase = mockPurchase({ paymentType: "installment" });
    const wallet = mockWallet(0);

    (Purchase.findById as jest.Mock).mockReturnValue({ populate: jest.fn().mockResolvedValue(purchase) });
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({ generationAncestors: [{ userId: "referrer1" }], placementAncestors: [] }),
    });
    (Settings.findOne as jest.Mock).mockResolvedValue({ maxGenerations: 0, generationCommission: [] });
    (Wallet.findOne as jest.Mock).mockResolvedValue(wallet);

    await distributeCommissions("purchase1");

    // 5% of 20000 downPayment = 1000
    expect(wallet.balance).toBe(1000);
  });

  test("skips direct commission if no referrer", async () => {
    const purchase = mockPurchase();

    (Purchase.findById as jest.Mock).mockReturnValue({ populate: jest.fn().mockResolvedValue(purchase) });
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({ generationAncestors: [], placementAncestors: [] }),
    });
    (Settings.findOne as jest.Mock).mockResolvedValue({ maxGenerations: 0, generationCommission: [] });

    await distributeCommissions("purchase1");

    expect(Wallet.findOne).not.toHaveBeenCalled();
  });

  test("adds managerial commission to placement ancestors", async () => {
    const purchase = mockPurchase();
    const referrerWallet = mockWallet(0);
    const parentWallet = mockWallet(0);

    (Purchase.findById as jest.Mock).mockReturnValue({ populate: jest.fn().mockResolvedValue(purchase) });

    (User.findById as jest.Mock)
      .mockReturnValueOnce({ select: jest.fn().mockResolvedValue({ generationAncestors: [{ userId: "referrer1" }], placementAncestors: [{ userId: "parent1", side: "A" }] }) }) // buyer
      .mockReturnValueOnce({ select: jest.fn().mockResolvedValue({ name: "Referrer", username: "referrer1" }) })  // referrer label
      .mockReturnValueOnce({ select: jest.fn().mockResolvedValue({ name: "Parent", username: "parent1", placementAncestors: [] }) }); // gen1 ancestor

    (Settings.findOne as jest.Mock).mockResolvedValue({
      maxGenerations: 1,
      generationCommission: [{ generation: 1, rate: 5 }],
    });

    (Wallet.findOne as jest.Mock)
      .mockResolvedValueOnce(referrerWallet)  // referrer direct commission
      .mockResolvedValueOnce(parentWallet);   // gen1 managerial commission

    await distributeCommissions("purchase1");

    // managerialPool = 10% of 100000 = 10000; gen1 = 5% of 10000 = 500
    expect(parentWallet.managerialCommissionBalance).toBe(500);
    expect(TransactionLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: "managerial_commission", amount: 500 })
    );
  });

  test("sets commissionProcessed to true after distribution", async () => {
    const purchase = mockPurchase();

    (Purchase.findById as jest.Mock).mockReturnValue({ populate: jest.fn().mockResolvedValue(purchase) });
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({ generationAncestors: [], placementAncestors: [] }),
    });
    (Settings.findOne as jest.Mock).mockResolvedValue({ maxGenerations: 0, generationCommission: [] });

    await distributeCommissions("purchase1");

    expect(purchase.commissionProcessed).toBe(true);
    expect(purchase.save).toHaveBeenCalled();
  });

  test("does nothing if referrer wallet not found", async () => {
    const purchase = mockPurchase();

    (Purchase.findById as jest.Mock).mockReturnValue({ populate: jest.fn().mockResolvedValue(purchase) });
    (User.findById as jest.Mock)
      .mockReturnValueOnce({ select: jest.fn().mockResolvedValue({ generationAncestors: [{ userId: "referrer1" }], placementAncestors: [] }) })
      .mockReturnValueOnce({ select: jest.fn().mockResolvedValue({ name: "Referrer", username: "referrer1" }) });
    (Settings.findOne as jest.Mock).mockResolvedValue({ maxGenerations: 0, generationCommission: [] });
    (Wallet.findOne as jest.Mock).mockResolvedValue(null);

    await distributeCommissions("purchase1");

    expect(purchase.commissionProcessed).toBe(false);
  });

  test("respects maxGenerations limit", async () => {
    const purchase = mockPurchase();
    const referrerWallet = mockWallet(0);
    const gen1Wallet = mockWallet(0);
    const gen2Wallet = mockWallet(0);

    (Purchase.findById as jest.Mock).mockReturnValue({ populate: jest.fn().mockResolvedValue(purchase) });

    (User.findById as jest.Mock)
      .mockReturnValueOnce({ select: jest.fn().mockResolvedValue({ generationAncestors: [{ userId: "referrer1" }], placementAncestors: [{ userId: "gen1", side: "A" }] }) }) // buyer
      .mockReturnValueOnce({ select: jest.fn().mockResolvedValue({ name: "Referrer", username: "referrer1" }) })  // referrer label
      .mockReturnValueOnce({ select: jest.fn().mockResolvedValue({ name: "Gen1", username: "gen1", placementAncestors: [{ userId: "gen2", side: "B" }] }) }); // gen1 ancestor

    (Settings.findOne as jest.Mock).mockResolvedValue({
      maxGenerations: 1,
      generationCommission: [
        { generation: 1, rate: 5 },
        { generation: 2, rate: 5 },
      ],
    });

    (Wallet.findOne as jest.Mock)
      .mockResolvedValueOnce(referrerWallet)
      .mockResolvedValueOnce(gen1Wallet)
      .mockResolvedValueOnce(gen2Wallet);

    await distributeCommissions("purchase1");

    // gen2 wallet should NOT receive managerial commission (maxGenerations: 1)
    expect(gen2Wallet.managerialCommissionBalance).toBe(0);
  });
});
