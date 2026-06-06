import { Router, Request, Response } from "express";
import { Purchase } from "../purchase/model";
import { InstallmentPayment } from "../purchase/installment.model";
import { Certificate } from "../certificate/model";
import { Wallet, TransactionLog } from "../wallet/model";
import { CommissionDebug } from "../purchase/commissionDebug.model";

const router = Router();

router.get("/commission-debug", async (_req: Request, res: Response) => {
  const logs = await CommissionDebug.find().sort({ createdAt: -1 }).lean();
  res.json({ logs });
});

router.delete("/commission-debug", async (_req: Request, res: Response) => {
  await CommissionDebug.deleteMany({});
  res.json({ message: "Commission debug logs cleared" });
});

router.get("/", async (_req: Request, res: Response) => {
  await Promise.all([
    Purchase.deleteMany({}),
    InstallmentPayment.deleteMany({}),
    Certificate.deleteMany({}),
    TransactionLog.deleteMany({}),
    CommissionDebug.deleteMany({}),
    Wallet.updateMany({}, {
      balance: 0,
      pendingManagerialCommissionBalance: 0,
    }),
  ]);
  res.json({ message: "Reset complete" });
});

export default router;
