"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const gallery_controller_1 = require("./gallery.controller");
const reusableControllers_1 = require("../shared/reusableControllers");
const gallery_model_1 = __importDefault(require("./gallery.model"));
const router = express_1.default.Router();
// Create a new Meta a
router.post("/create", gallery_controller_1.create);
router.get("/all", gallery_controller_1.getAll);
// router.get("/search", searchGallery);
router.get("/:id", gallery_controller_1.getOne);
router.put("/:id", gallery_controller_1.update);
router.delete("/:id", gallery_controller_1.remove);
router.delete("/delete/:id", (0, reusableControllers_1.deleteById)(gallery_model_1.default));
exports.default = router;
