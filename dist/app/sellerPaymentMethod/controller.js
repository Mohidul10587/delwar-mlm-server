"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateById =
  exports.deleteById =
  exports.getBySellerIdForUserIndexPage =
  exports.create =
    void 0;
const model_1 = require("./model");
const create = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const item = yield model_1.PayMethod.create(req.body);
      res
        .status(201)
        .json({ message: "Payment method saved successfully!", item });
    } catch (error) {
      res.status(500).json({
        message: "Failed to save payment method.",
        error: error.message,
      });
    }
  });
exports.create = create;
const getBySellerIdForUserIndexPage = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const { sellerId } = req.params;
      const items = yield model_1.PayMethod.find({ sellerId }).sort({
        createdAt: -1,
      });
      res.status(200).json(items);
    } catch (error) {
      res.status(500).json({
        message: "Failed to fetch payment methods.",
        error: error.message,
      });
    }
  });
exports.getBySellerIdForUserIndexPage = getBySellerIdForUserIndexPage;
const deleteById = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const { id } = req.params;
      yield model_1.PayMethod.findByIdAndDelete(id);
      res.status(200).json({ message: "Payment method deleted successfully!" });
    } catch (error) {
      res.status(500).json({
        message: "Failed to delete payment method.",
        error: error.message,
      });
    }
  });
exports.deleteById = deleteById;
const updateById = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const { id } = req.params;
      const item = yield model_1.PayMethod.findByIdAndUpdate(id, req.body, {
        new: true,
      });
      res
        .status(200)
        .json({ message: "Payment method updated successfully!", item });
    } catch (error) {
      res.status(500).json({
        message: "Failed to update payment method.",
        error: error.message,
      });
    }
  });
exports.updateById = updateById;
