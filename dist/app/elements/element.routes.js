"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const element_controller_1 = require("./element.controller"); // Your controller function
const middlewares_1 = require("../user/middlewares");
const router = (0, express_1.Router)();
// Route to handle form submission and image upload
router.post("/create", middlewares_1.verifyAdmin, element_controller_1.create);
router.get(
  "/allForIndexPageByTargetedPageAndId",
  middlewares_1.verifyAdmin,
  element_controller_1.allForIndexPageByTargetedPageAndId
);
router.get("/elementById/:id", element_controller_1.elementById);
// Get PageElement by ID
router.get("/singleElement/:id", element_controller_1.getElementById);
router.get("/singleForEditPage/:id", element_controller_1.singleForEditPage);
// Get all PageElements by page property
router.patch(
  "/updateStatus/:id",
  middlewares_1.verifyAdmin,
  element_controller_1.updatePageElementStatus
);
// Delete a single PageElement by ID
router.delete(
  "/delete/:id",
  middlewares_1.verifyAdmin,
  element_controller_1.deletePageElementById
);
// PUT route for updating page elements
router.put(
  "/update/:id",
  middlewares_1.verifyAdmin,
  element_controller_1.update
);
exports.default = router;
