"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isObjectId = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const isObjectId = (value) => mongoose_1.default.Types.ObjectId.isValid(value);
exports.isObjectId = isObjectId;
