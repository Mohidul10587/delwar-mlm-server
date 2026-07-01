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
exports.isTransactionIdUsed = isTransactionIdUsed;
const model_1 = require("../app/purchase/model");
const model_2 = require("../app/investment/model");
const installment_model_1 = require("../app/purchase/installment.model");
/**
 * Fix F-09, F-10: Check transactionId uniqueness across
 * Purchase, InstallmentPayment, and Investment collections.
 */
function isTransactionIdUsed(transactionId) {
    return __awaiter(this, void 0, void 0, function* () {
        const [p, inv, inst] = yield Promise.all([
            model_1.Purchase.exists({ transactionId }),
            model_2.Investment.exists({ transactionId }),
            installment_model_1.InstallmentPayment.exists({ transactionId }),
        ]);
        return !!(p || inv || inst);
    });
}
