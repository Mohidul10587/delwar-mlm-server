import { Purchase } from "../app/purchase/model";
import { Investment } from "../app/investment/model";

export async function isTransactionIdUsed(transactionId: string): Promise<boolean> {
  const [p, inv] = await Promise.all([
    Purchase.exists({ transactionId }),
    Investment.exists({ transactionId }),
  ]);
  return !!(p || inv);
}
