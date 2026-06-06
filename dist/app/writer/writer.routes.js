"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const writer_controller_1 = require("./writer.controller");
const middlewares_1 = require("../user/middlewares");
const reusableControllers_1 = require("../shared/reusableControllers");
const writer_model_1 = __importDefault(require("./writer.model"));
const router = (0, express_1.Router)();
router.post("/create", middlewares_1.verifyStaffWriterPermission, writer_controller_1.create);
router.post("/createBySeller", middlewares_1.verSellerTkn, writer_controller_1.create);
// Route to get all writer IDs
router.get("/singleForEditPage/:id", writer_controller_1.singleForEditPage);
router.put("/update/:id", middlewares_1.verifyStaffWriterPermission, writer_controller_1.update);
router.get("/all", writer_controller_1.getAllBrands);
router.get("/singleWriterBySlug/:slug", writer_controller_1.getWriterBySlug);
router.get("/singleWriter/:id", writer_controller_1.getWriteById);
router.get("/getAllForPageBuilder", writer_controller_1.getAllForPageBuilder);
router.delete("/delete/:id", middlewares_1.verifyStaffWriterPermission, (0, reusableControllers_1.deleteById)(writer_model_1.default));
exports.default = router;
