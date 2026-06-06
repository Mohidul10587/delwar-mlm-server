"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const publishers_controller_1 = require("./publishers.controller");
const uploadSingleFileToCloudinary_1 = require("../shared/uploadSingleFileToCloudinary");
const middlewares_1 = require("../user/middlewares");
const router = (0, express_1.Router)();
router.post(
  "/create",
  middlewares_1.verifyAdmin,
  uploadSingleFileToCloudinary_1.uploadMiddleware,
  publishers_controller_1.createPublisher
);
// Route to get all publisher IDs
router.get("/allPublisherIds", publishers_controller_1.getAllPublisherIds);
router.get("/all", publishers_controller_1.getAllPublishers);
router.get(
  "/allForProductUploadPage",
  publishers_controller_1.allForProductUploadPage
);
// router.get("/allForNavbar", getAllPublishersForNavbar);
// router.get("/allForPublisherPage", getAllPublishersForPublisherPage);
router.get(
  "/singlePublisherBySlug/:slug",
  publishers_controller_1.getPublisherBySlug
);
router.get("/singlePublisher/:id", publishers_controller_1.getPublisherById);
router.get("/allForIndexPage", publishers_controller_1.allForIndexPage);
// router.put("/updatePublisher/:id", verifyAdmin, uploadMiddleware, updatePublisher);
router.delete(
  "/:id",
  middlewares_1.verifyAdmin,
  publishers_controller_1.deletePublisher
);
router.get(
  "/allPublisherForFiltering",
  publishers_controller_1.allPublisherForFiltering
);
exports.default = router;
