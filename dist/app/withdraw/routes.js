"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const withdraw_controller_1 = require("./withdraw.controller");
const auth_1 = require("../../middleware/auth");
const router = express_1.default.Router();
// Routes
router.post("/createWithdrawRequest", auth_1.verifyUser, withdraw_controller_1.createWithdrawRequest); // Create a transaction
router.get("/getWithdrawRequestsForAdmin", auth_1.verifyAdmin, withdraw_controller_1.getWithdrawRequestsForAdmin);
router.get("/my-withdrawals", auth_1.verifyUser, withdraw_controller_1.getMyWithdrawals);
// Route to update withdrawal status
router.put("/updateStatus/:withdrawId", withdraw_controller_1.updateStatus);
exports.default = router;
