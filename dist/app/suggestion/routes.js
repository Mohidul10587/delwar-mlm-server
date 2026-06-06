"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const controller_1 = require("./controller");
const middlewares_1 = require("../user/middlewares");
const reusableControllers_1 = require("../shared/reusableControllers");
const model_1 = __importDefault(require("./model"));
const router = express_1.default.Router();
router.get("/", controller_1.getAllSuggestions);
router.get("/allForAdminIndexPage", controller_1.allForAdminIndexPage);
router.get(
  "/singleForEditPage/:id",
  middlewares_1.verifyAdmin,
  controller_1.singleForEditPage
);
router.get("/getSingleSuggestion/:id", controller_1.getSuggestionById);
router.post("/create", controller_1.create);
router.delete("/:id", controller_1.deleteSuggestion);
router.put("/update/:id", controller_1.update);
router.delete(
  "/delete/:id",
  middlewares_1.verifyAdmin,
  (0, reusableControllers_1.deleteById)(model_1.default)
);
exports.default = router;
