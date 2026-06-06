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
const axios_1 = __importDefault(require("axios"));
class SMSService {
    constructor() {
        this.config = {
            provider: process.env.SMS_PROVIDER || "mimsms",
            username: process.env.SMS_USERNAME || "",
            apiKey: process.env.SMS_API_KEY || "",
            senderName: process.env.SMS_SENDER || "BOOKSHOP",
            baseUrl: process.env.SMS_BASE_URL || "https://api.mimsms.com",
        };
    }
    generateOrderMessage(data) {
        const productList = data.products
            .slice(0, 2)
            .map((p) => `${p.title} (${p.quantity})`)
            .join(", ");
        const moreItems = data.products.length > 2 ? ` +${data.products.length - 2} more` : "";
        switch (data.status) {
            case "Pending":
                return `Order #${data.orderId} confirmed! Items: ${productList}${moreItems}. Total: ৳${data.totalAmount}. We'll update you on delivery.`;
            case "Delivered":
                return `Order #${data.orderId} delivered successfully! Items: ${productList}${moreItems}. Total: ৳${data.totalAmount}. Thank you for shopping with us!`;
            case "Cancelled":
                return `Order #${data.orderId} has been cancelled. Items: ${productList}${moreItems}. If you have any questions, please contact us.`;
            case "Returned":
                return `Order #${data.orderId} has been returned. Items: ${productList}${moreItems}. Refund will be processed shortly.`;
            default:
                return `Order #${data.orderId} status updated to ${data.status}. Total: ৳${data.totalAmount}.`;
        }
    }
    sendOrderSMS(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const message = this.generateOrderMessage(data);
                return yield this.sendSMS(data.phone, message);
            }
            catch (error) {
                console.error("SMS sending failed:", error);
                return false;
            }
        });
    }
    sendSMS(phone, message) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.config.apiKey || !this.config.username) {
                return true;
            }
            try {
                const response = yield axios_1.default.post(`${this.config.baseUrl}/api/SmsSending/SMS`, {
                    UserName: this.config.username,
                    Apikey: this.config.apiKey,
                    MobileNumber: phone.startsWith("88") ? phone : `88${phone}`,
                    CampaignId: "null",
                    SenderName: this.config.senderName,
                    TransactionType: "T",
                    Message: message,
                }, {
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                });
                return (response.data.statusCode === "200" && response.data.status === "Success");
            }
            catch (error) {
                console.error("MIM SMS API error:", error);
                return false;
            }
        });
    }
}
exports.default = new SMSService();
