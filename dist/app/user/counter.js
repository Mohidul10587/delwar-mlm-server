"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Counter = void 0;
const mongoose_1 = require("mongoose");
const CounterSchema = new mongoose_1.Schema({
    _id: String,
    seq: { type: Number, default: 0 }
});
exports.Counter = (0, mongoose_1.model)("Counter", CounterSchema);
