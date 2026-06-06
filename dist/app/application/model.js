"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SellerApplication = void 0;
const mongoose_1 = require("mongoose");
const SellerApplicationSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    companyName: {
        en: { type: String, default: "" },
        bn: { type: String, default: "" }
    },
    companyEmail: { type: String, default: "" },
    companyPhone: { type: String, default: "" },
    companyFacebook: { type: String, default: "" },
    companyWhatsapp: { type: String, default: "" },
    companyCoverImg: { type: String, default: "" },
    companyProfileImg: { type: String, default: "" },
    firstContactPersonName: { type: String, default: "" },
    firstContactPersonPhone: { type: String, default: "" },
    secondContactPersonName: { type: String, default: "" },
    secondContactPersonPhone: { type: String, default: "" },
    commission: { type: Number, default: 10 },
    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
    },
}, { timestamps: true });
exports.SellerApplication = (0, mongoose_1.model)("SellerApplication", SellerApplicationSchema);
