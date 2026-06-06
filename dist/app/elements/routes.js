"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = require("./controller"); // Your controller function
const middlewares_1 = require("../user/middlewares");
const router = (0, express_1.Router)();
// Route to handle form submission and image upload
router.post("/create", middlewares_1.verifyAdmin, controller_1.create);
router.get(
  "/allForIndexPageByTargetedPageAndId",
  middlewares_1.verifyAdmin,
  controller_1.allForIndexPageByTargetedPageAndId
);
router.get("/allForAdmin", middlewares_1.verifyAdmin, controller_1.allForAdmin);
router.get("/homePageElement", controller_1.getHomePageElement);
// Get PageElement by ID
router.get("/singleElement/:id", controller_1.getElementById);
router.get("/singleForEditPage/:id", controller_1.singleForEditPage);
// Get all PageElements by page property
router.patch(
  "/updateStatus/:id",
  middlewares_1.verifyAdmin,
  controller_1.updatePageElementStatus
);
// Delete a single PageElement by ID
router.delete(
  "/delete/:id",
  middlewares_1.verifyAdmin,
  controller_1.deletePageElementById
);
// PUT route for updating page elements
router.put("/update/:id", middlewares_1.verifyAdmin, controller_1.update);
exports.default = router;
