"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const resetController_1 = require("./resetController");
const router = (0, express_1.Router)();
// DANGER: This route deletes all financial data
router.get("/reset", resetController_1.resetAllFinancialData);
exports.default = router;
