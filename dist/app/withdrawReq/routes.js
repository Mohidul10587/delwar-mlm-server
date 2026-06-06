"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = require("./controller");
const middlewares_1 = require("../user/middlewares");
const router = (0, express_1.Router)();
router.post("/create", middlewares_1.verifyUser, controller_1.create);
router.get("/allRequests", middlewares_1.verifyAdmin, controller_1.allRequests);
router.get("/pendings", middlewares_1.verifyAdmin, controller_1.pendings);
router.get("/approveds", middlewares_1.verifyAdmin, controller_1.approveds);
router.get("/rejecteds", middlewares_1.verifyAdmin, controller_1.rejecteds);
router.get("/getById/:id", middlewares_1.verifyAdmin, controller_1.getById);
router.get(
  "/user/requests",
  middlewares_1.verifyUser,
  controller_1.getUserRequests
);
router.get(
  "/user/requests/:id",
  middlewares_1.verifyUser,
  controller_1.getUserRequestById
);
router.patch(
  "/approve/:withdrawId",
  middlewares_1.verifyAdmin,
  controller_1.approve
);
router.patch(
  "/reject/:withdrawId",
  middlewares_1.verifyAdmin,
  controller_1.reject
);
exports.default = router;
