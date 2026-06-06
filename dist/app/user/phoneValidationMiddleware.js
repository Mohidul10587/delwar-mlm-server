"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePhoneMiddleware = void 0;
const phoneValidation_1 = require("../shared/phoneValidation");
const validatePhoneMiddleware = (req, res, next) => {
    const { phone } = req.body;
    if (!phone) {
        return res.status(400).json({
            success: false,
            message: "Phone number is required",
        });
    }
    // Validate the phone number directly (don't normalize first)
    const validation = (0, phoneValidation_1.validateBangladeshiPhone)(phone);
    if (!validation.isValid) {
        return res.status(400).json({
            success: false,
            message: validation.error || "Invalid phone number",
        });
    }
    // Store the validated phone number in request
    req.body.phone = validation.formattedPhone;
    next();
};
exports.validatePhoneMiddleware = validatePhoneMiddleware;
