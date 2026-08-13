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
exports.generateCustomId = generateCustomId;
const counter_1 = require("../app/user/counter");
/**
 * Generates a custom unique ID with the given prefix.
 * Format: PREFIX-YYYYNNNNN
 *   PREFIX  — e.g. "CUS", "PRJ", "PAY", "CERT"
 *   YYYY    — current year (4 digits)
 *   NNNNN   — zero-padded sequential number (5 digits, resets per year)
 *
 * Examples:
 *   CUS-20260001, PRJ-20260001, PAY-20260001, CERT-20260001
 *
 * Uses an atomic MongoDB counter per (prefix + year) so IDs are
 * collision-free even under concurrent requests.
 */
function generateCustomId(prefix) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const year = new Date().getFullYear();
        const counterId = `${prefix.toLowerCase()}-seq-${year}`;
        const doc = yield counter_1.Counter.findOneAndUpdate({ _id: counterId }, { $inc: { seq: 1 } }, { new: true, upsert: true });
        const seq = (_a = doc === null || doc === void 0 ? void 0 : doc.seq) !== null && _a !== void 0 ? _a : 1;
        const padded = String(seq).padStart(5, "0");
        return `${prefix}-${year}${padded}`;
    });
}
