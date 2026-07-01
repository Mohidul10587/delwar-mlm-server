import { Purchase } from "../app/purchase/model";
import { Investment } from "../app/investment/model";
import { InstallmentPayment } from "../app/purchase/installment.model";

/**
 * Fix F-09, F-10: Check transactionId uniqueness across
 * Purchase, InstallmentPayment, and Investment collections.
 */
export async function isTransactionIdUsed(transactionId: string): Promise<boolean> {
  const [p, inv, inst] = await Promise.all([
    Purchase.exists({ transactionId }),
    Investment.exists({ transactionId }),
    InstallmentPayment.exists({ transactionId }),
  ]);
  return !!(p || inv || inst);
}
