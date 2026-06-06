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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processPayment = void 0;
const axios_1 = __importDefault(require("axios"));
const mongoose_1 = __importDefault(require("mongoose"));
const model_1 = __importDefault(require("../../order/model"));
const model_2 = __importDefault(require("../../settings/model"));
const MERCHANT_ID = process.env.AMARPAY_MERCHANT_ID;
const SIGNATURE_KEY = process.env.AMARPAY_SIGNATURE_KEY;
const BASE_URL = "https://sandbox.aamarpay.com";
const redirectUrl = "https://a-b-server.vercel.app";
const clientSideUrl = "https://www.notebookprokash.com";
const processPayment = (req, res, next, validationFn, description, handleAfterOrder) => __awaiter(void 0, void 0, void 0, function* () {
    const { amount, transactionId, name, email, phone, orderInfoForStore } = req.body;
    if (!amount || !transactionId) {
        return res.status(400).json({ message: "Required fields are missing" });
    }
    const session = yield mongoose_1.default.startSession();
    try {
        session.startTransaction();
        const settings = yield model_2.default.findOne().session(session);
        const DELIVERY_CHARGE = (settings === null || settings === void 0 ? void 0 : settings.deliveryCharge) || 60;
        const cartItems = orderInfoForStore.cart;
        const calculatedTotal = yield validationFn(cartItems, session);
        const baseAmount = amount - DELIVERY_CHARGE;
        if (Math.abs(baseAmount - calculatedTotal) > 0.01) {
            yield session.abortTransaction();
            return res.status(400).json({
                message: `Amount mismatch. Expected: ${calculatedTotal}, got: ${baseAmount}`,
            });
        }
        const newOrder = yield model_1.default.create([orderInfoForStore], { session });
        if (handleAfterOrder) {
            yield handleAfterOrder(req, newOrder, session);
        }
        const paymentData = {
            store_id: MERCHANT_ID || "aamarpaytest",
            signature_key: SIGNATURE_KEY || "dbb74894e82415a2f7ff0ec3a97e4183",
            amount,
            desc: description,
            payment_type: "VISA",
            currency: "BDT",
            tran_id: transactionId,
            cus_name: name,
            cus_email: email || "example@gmail.com",
            cus_phone: phone,
            success_url: `${redirectUrl}/payment/success/${transactionId}`,
            fail_url: `${redirectUrl}/payment/fail/${transactionId}`,
            cancel_url: `${clientSideUrl}/checkout`,
            type: "json",
        };
        const response = yield axios_1.default.post(`${BASE_URL}/jsonpost.php`, paymentData);
        if (!response.data.payment_url) {
            throw new Error("Failed to receive payment URL");
        }
        yield session.commitTransaction();
        res.json({ paymentUrl: response.data.payment_url });
    }
    catch (error) {
        yield session.abortTransaction();
        next(error);
    }
    finally {
        session.endSession();
    }
});
exports.processPayment = processPayment;
