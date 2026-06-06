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
exports.rupantorComboPayment = void 0;
const shared_1 = require("../shared");
const model_1 = require("../../comboOffer/model");
const rupantorComboPayment = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, shared_1.processRupantorPayment)(req, res, next, (cartItems, session) => __awaiter(void 0, void 0, void 0, function* () {
        let total = 0;
        for (const item of cartItems) {
            const combo = yield model_1.ComboOffer.findById(item._id).session(session);
            if (!combo) {
                throw new Error(`Combo offer not found: ${item._id}`);
            }
            total += combo.sellingPrice * item.quantity;
        }
        return total;
    }));
});
exports.rupantorComboPayment = rupantorComboPayment;
