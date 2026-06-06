"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePhoneNumber = exports.validateBangladeshiPhone = exports.PHONE_VALIDATION_RULES = void 0;
exports.PHONE_VALIDATION_RULES = {
    PREFIX: "+88",
    FIRST_DIGIT: "0",
    SECOND_DIGIT: "1",
    MAX_DIGITS: 11,
    PATTERN: /^01\d{9}$/,
};
const validateBangladeshiPhone = (input) => {
    if (!input || typeof input !== "string") {
        return { isValid: false, error: "Phone number is required" };
    }
    console.log(input);
    // Check if it starts with +8801
    if (!input.startsWith("+8801")) {
        return { isValid: false, error: "Phone number must start with +8801" };
    }
    // Remove +88 prefix and validate the remaining part
    const phoneWithoutCountryCode = input.substring(3); // Remove '+88'
    const digits = phoneWithoutCountryCode.replace(/\D/g, "");
    if (digits.length !== exports.PHONE_VALIDATION_RULES.MAX_DIGITS) {
        return {
            isValid: false,
            error: `Phone number must be exactly ${exports.PHONE_VALIDATION_RULES.MAX_DIGITS} digits after +88`,
        };
    }
    if (!exports.PHONE_VALIDATION_RULES.PATTERN.test(digits)) {
        return { isValid: false, error: "Invalid phone number format" };
    }
    return {
        isValid: true,
        formattedPhone: input,
    };
};
exports.validateBangladeshiPhone = validateBangladeshiPhone;
const normalizePhoneNumber = (phone) => {
    // Remove any non-digit characters
    const digits = phone.replace(/\D/g, "");
    // If it starts with 88, remove it (assuming it's +88)
    if (digits.startsWith("88") && digits.length === 13) {
        return digits.substring(2);
    }
    return digits;
};
exports.normalizePhoneNumber = normalizePhoneNumber;
