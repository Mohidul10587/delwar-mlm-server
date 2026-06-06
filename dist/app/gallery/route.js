"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const controller_1 = require("./controller");
const reusableControllers_1 = require("../shared/reusableControllers");
const model_1 = __importDefault(require("./model"));
const router = express_1.default.Router();
// Create a new Meta a
router.post("/create", controller_1.create);
router.get("/all", controller_1.getAll);
// router.get("/search", searchGallery);
router.get("/:id", controller_1.getOne);
router.put("/:id", controller_1.update);
router.delete("/:id", controller_1.remove);
router.delete("/delete/:id", (0, reusableControllers_1.deleteById)(model_1.default));
exports.default = router;
