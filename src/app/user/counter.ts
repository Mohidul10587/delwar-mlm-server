import { Schema, model } from "mongoose";

const CounterSchema = new Schema({
  _id: String,
  seq: { type: Number, default: 0 }
});

export const Counter = model("Counter", CounterSchema);
