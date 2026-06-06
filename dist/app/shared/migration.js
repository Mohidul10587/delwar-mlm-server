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
exports.migrateExistingDocuments = void 0;
const model_1 = __importDefault(require("../user/model"));
const model_2 = __importDefault(require("../writer/model"));
const counter_1 = require("../shared/counter");
const migrateExistingDocuments = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Migrate Users
        const users = yield model_1.default.find({ userId: { $exists: false } }).sort({
            createdAt: 1,
        });
        for (const user of users) {
            user.userId = yield (0, counter_1.getNextSequence)("userId");
            yield user.save();
        }
        // Migrate Writers
        const writers = yield model_2.default.find({ writerId: { $exists: false } }).sort({
            createdAt: 1,
        });
        for (const writer of writers) {
            writer.writerId = yield (0, counter_1.getNextSequence)("writerId");
            yield writer.save();
        }
    }
    catch (error) {
        console.error("Migration failed:", error);
    }
});
exports.migrateExistingDocuments = migrateExistingDocuments;
