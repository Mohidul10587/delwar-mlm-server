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
exports.verifyRupantorPayment = exports.processRupantorPayment = void 0;
const axios_1 = __importDefault(require("axios"));
const mongoose_1 = __importDefault(require("mongoose"));
const model_1 = __importDefault(require("../../order/model"));
const model_2 = __importDefault(require("../../settings/model"));
const API_KEY = process.env.RUPANTOR_API_KEY;
const BASE_URL = "https://payment.rupantorpay.com/api";
const redirectUrl = "https://a-b-server.vercel.app";
const clientSideUrl = "https://www.notebookprokash.com";
console.log("Rupantor API Key:", API_KEY ? "Set" : "Missing");
console.log("Base URL:", BASE_URL);
const processRupantorPayment = (req, res, next, validationFn, handleAfterOrder) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
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
            fullname: name,
            email: email || "example@gmail.com",
            amount: amount.toString(),
            success_url: `${redirectUrl}/payment/rupantor/success/${transactionId}`,
            cancel_url: `${clientSideUrl}/checkout`,
            webhook_url: `${redirectUrl}/payment/rupantor/webhook/${transactionId}`,
            meta_data: {
                phone,
                transaction_id: transactionId,
            },
        };
        console.log("Payment Data:", paymentData);
        const response = yield axios_1.default.post(`${BASE_URL}/payment/checkout`, paymentData, {
            headers: {
                "X-API-KEY": API_KEY,
                "Content-Type": "application/json",
                "X-CLIENT": req.get("host") || "localhost",
            },
            timeout: 30000,
            httpsAgent: new (require("https").Agent)({
                rejectUnauthorized: false,
            }),
        });
        console.log("Rupantor Payment Response:", response.data);
        if (!response.data.payment_url) {
            throw new Error("Failed to receive payment URL");
        }
        yield session.commitTransaction();
        res.json({ paymentUrl: response.data.payment_url });
    }
    catch (error) {
        yield session.abortTransaction();
        console.error("Rupantor Payment Error:", ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
        next(error);
    }
    finally {
        session.endSession();
    }
});
exports.processRupantorPayment = processRupantorPayment;
const verifyRupantorPayment = (transactionId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const response = yield axios_1.default.post(`${BASE_URL}/payment/verify-payment`, {
            transaction_id: transactionId,
        }, {
            headers: {
                "X-API-KEY": API_KEY,
                "Content-Type": "application/json",
            },
            timeout: 30000,
            httpsAgent: new (require("https").Agent)({
                rejectUnauthorized: false,
            }),
        });
        return response.data;
    }
    catch (error) {
        console.error("Rupantor Verify Error:", ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
        throw new Error("Payment verification failed");
    }
});
exports.verifyRupantorPayment = verifyRupantorPayment;
