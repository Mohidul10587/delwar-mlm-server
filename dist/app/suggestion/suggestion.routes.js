"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const suggestion_controller_1 = require("./suggestion.controller");
const middlewares_1 = require("../user/middlewares");
const reusableControllers_1 = require("../shared/reusableControllers");
const suggestion_model_1 = __importDefault(require("./suggestion.model"));
const router = express_1.default.Router();
router.get("/", suggestion_controller_1.getAllSuggestions);
router.get(
  "/allForAdminIndexPage",
  suggestion_controller_1.allForAdminIndexPage
);
router.get(
  "/singleForEditPage/:id",
  middlewares_1.verifyAdmin,
  suggestion_controller_1.singleForEditPage
);
router.get(
  "/getSingleSuggestion/:id",
  suggestion_controller_1.getSuggestionById
);
router.post("/create", suggestion_controller_1.create);
router.delete("/:id", suggestion_controller_1.deleteSuggestion);
router.put("/update/:id", suggestion_controller_1.update);
router.delete(
  "/delete/:id",
  middlewares_1.verifyAdmin,
  (0, reusableControllers_1.deleteById)(suggestion_model_1.default)
);
exports.default = router;
