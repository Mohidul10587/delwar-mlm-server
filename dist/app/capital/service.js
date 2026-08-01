"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.parseCapitalInput = void 0;
exports.createCapital = createCapital;
exports.updateCapital = updateCapital;
exports.deleteCapital = deleteCapital;
const mongoose_1 = __importStar(require("mongoose"));
const zod_1 = require("zod");
const model_1 = require("./model");
const model_2 = require("../ledger/model");
const capitalInputSchema = zod_1.z.object({
    date: zod_1.z.coerce.date({ error: "A valid date is required" }),
    description: zod_1.z.string().trim().min(1, "Description is required"),
    amount: zod_1.z.coerce.number().positive("Amount must be greater than zero"),
    paymentInfo: zod_1.z.string().trim().optional().default(""),
    paidBy: zod_1.z.string().trim().optional().default(""),
    voucherNo: zod_1.z.string().trim().optional().default(""),
    document: zod_1.z.string().trim().optional().default(""),
});
const ledgerNote = (capital) => [
    `Capital received: ${capital.description}`,
    capital.paidBy && `Paid by: ${capital.paidBy}`,
    capital.voucherNo && `Voucher: ${capital.voucherNo}`,
    capital.paymentInfo && `Payment info: ${capital.paymentInfo}`,
].filter(Boolean).join(" | ");
const notFound = (message) => Object.assign(new Error(message), { status: 404 });
const parseCapitalInput = (input) => capitalInputSchema.parse(input);
exports.parseCapitalInput = parseCapitalInput;
function createCapital(input, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        const session = yield mongoose_1.default.startSession();
        try {
            let capital = null;
            yield session.withTransaction(() => __awaiter(this, void 0, void 0, function* () {
                // Create the source record first, then atomically attach its one ledger row.
                const [created] = yield model_1.Capital.create([Object.assign(Object.assign({}, input), { ledgerId: new mongoose_1.Types.ObjectId(), createdBy: userId, updatedBy: userId })], { session });
                const ledger = new model_2.CompanyLedger({
                    _id: created.ledgerId,
                    date: input.date,
                    type: "capital_received",
                    amount: input.amount,
                    relatedId: created._id,
                    relatedModel: "Capital",
                    note: ledgerNote(input),
                });
                yield ledger.save({ session });
                capital = created;
            }));
            return capital;
        }
        finally {
            yield session.endSession();
        }
    });
}
function updateCapital(id, input, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        const session = yield mongoose_1.default.startSession();
        try {
            let capital = null;
            yield session.withTransaction(() => __awaiter(this, void 0, void 0, function* () {
                const existing = yield model_1.Capital.findById(id).session(session);
                if (!existing)
                    throw notFound("Capital entry not found");
                const ledger = yield model_2.CompanyLedger.findOneAndUpdate({ _id: existing.ledgerId, relatedId: existing._id, type: "capital_received" }, { $set: { date: input.date, amount: input.amount, note: ledgerNote(input) } }, { new: true, session });
                if (!ledger)
                    throw new Error("Related capital ledger entry is missing");
                Object.assign(existing, input, { updatedBy: userId });
                yield existing.save({ session });
                capital = existing;
            }));
            return capital;
        }
        finally {
            yield session.endSession();
        }
    });
}
function deleteCapital(id) {
    return __awaiter(this, void 0, void 0, function* () {
        const session = yield mongoose_1.default.startSession();
        try {
            yield session.withTransaction(() => __awaiter(this, void 0, void 0, function* () {
                const capital = yield model_1.Capital.findById(id).session(session);
                if (!capital)
                    throw notFound("Capital entry not found");
                const deletedLedger = yield model_2.CompanyLedger.findOneAndDelete({
                    _id: capital.ledgerId, relatedId: capital._id, type: "capital_received",
                }, { session });
                if (!deletedLedger)
                    throw new Error("Related capital ledger entry is missing");
                yield capital.deleteOne({ session });
            }));
        }
        finally {
            yield session.endSession();
        }
    });
}
