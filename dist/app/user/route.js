"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
// routes/user.routes.ts
const express_1 = __importDefault(require("express"));
const phoneValidationMiddleware_1 = require("./phoneValidationMiddleware");
const controller_1 = require("./controller");
const middlewares_1 = require("./middlewares");
const reusableControllers_1 = require("../shared/reusableControllers");
const model_1 = __importDefault(require("./model"));
const middlewares_2 = require("./middlewares");
const router = express_1.default.Router();
//=================== For user ===================
router.get("/singleUser/:userId", controller_1.getSingleUser);
router.get("/allPublisherForFiltering", controller_1.allPublisherForFiltering);
router.get("/getUserByIdForAdmin/:userId", controller_1.getUserByIdForAdmin);
router.get("/getSingleUserBySlug/:userSlug", controller_1.getSingleUserBySlug);
router.get("/getSingleUserById/:id", controller_1.getSingleUserById);
router.get("/sellerStatus/:userSlug", controller_1.getStatus);
router.get(
  "/singleForEditPage/:id",
  middlewares_1.verifyUser,
  controller_1.singleForEditPage
);
router.get(
  "/getSummaryOfActivity",
  middlewares_1.verifyUser,
  controller_1.getSummaryOfActivity
);
router.put("/update/:id", middlewares_1.verifyUser, controller_1.update);
//================For user authentication ===================
router.get("/getAuthenticatedUser", controller_1.getAuthenticatedUser);
router.post(
  "/signUpByCredentials",
  phoneValidationMiddleware_1.validatePhoneMiddleware,
  controller_1.signUpByCredentials
);
router.post("/verifyOTP", controller_1.verifyOTP);
router.post("/resendOTP", controller_1.resendOTP);
router.post(
  "/logInByCredentials",
  phoneValidationMiddleware_1.validatePhoneMiddleware,
  controller_1.logInByCredentials
);
// Google authentication removed - only phone authentication supported
router.post("/setCookie", controller_1.setCookie);
router.post("/logout", controller_1.logOut);
router.post(
  "/forgot-password",
  phoneValidationMiddleware_1.validatePhoneMiddleware,
  controller_1.forgotPassword
);
router.post("/reset-password", controller_1.resetPassword);
router.patch(
  "/update-password",
  middlewares_1.verifyUser,
  controller_1.updateUserPasswordByUser
);
//===================== For Admin=====================
router.get(
  "/getAllSellerForFilterPage",
  controller_1.getAllSellerForFilterPage
);
router.get(
  "/allUserForAdmin",
  middlewares_2.verifyAdmin,
  controller_1.allUserForAdmin
);
router.get(
  "/singleForEditForSellerSettings/:id",
  controller_1.singleForEditForSellerSettings
);
router.patch(
  "/promoteUserToSellerByAdmin/:applicationId",
  middlewares_2.verifyAdmin,
  controller_1.promoteUserToSellerByAdmin
);
router.patch(
  "/enabledOrDisableSellerByAdmin/:sellerId",
  middlewares_2.verifyAdmin,
  controller_1.enabledOrDisableSellerByAdmin
);
router.patch(
  "/updateUserPassword/:userId",
  middlewares_2.verifyAdmin,
  controller_1.updateUserPassword
);
router.patch(
  "/updateSellerCommission/:userId",
  middlewares_2.verifyAdmin,
  controller_1.updateSellerCommission
);
router.get(
  "/getDetailsOFSingleUserForAdminCustomerDetailsComponent/:id",
  // verifyAdmin,
  controller_1.getDetailsOFSingleUserForAdminCustomerDetailsComponent
);
router.get(
  "/check-user-email",
  middlewares_1.verifyUser,
  controller_1.checkUser_Email
);
router.get(
  "/checkStuff",
  middlewares_2.verifyStuffToken,
  controller_1.checkUser_Email
);
router.get(
  "/allOrdersOfUser",
  middlewares_1.verifyUser,
  controller_1.allOrdersOfUser
);
router.get(
  "/getSingleOrder/:id",
  middlewares_1.verifyUser,
  controller_1.getSingleOrder
);
router.get(
  "/allForAdminIndexPage",
  middlewares_2.verifyAdmin,
  controller_1.allForAdminIndexPage
);
router.get(
  "/allStuffForAdminIndexPage",
  middlewares_2.verifyAdmin,
  controller_1.allStuffForAdminIndexPage
);
router.get(
  "/getContactInfoOfSingleUserBySlug/:userSlug",
  controller_1.getContactInfoOfSingleUserBySlug
);
router.get(
  "/getSingleUserForAddToCartComponent/:id",
  controller_1.getSingleUserForAddToCartComponent
);
router.patch(
  "/updateUserPersonalInfo/:userId",
  middlewares_1.verifyUser,
  controller_1.updateUserPersonalInfo
);
router.patch(
  "/updateStatus/:id",
  middlewares_2.verifyAdmin,
  controller_1.updateStatus
);
router.patch(
  "/updatePassword/:id",
  middlewares_2.verifyAdmin,
  controller_1.updatePassword
);
router.delete(
  "/delete/:id",
  middlewares_2.verifyAdmin,
  (0, reusableControllers_1.deleteById)(model_1.default)
);
//===================== Staff Management =====================
router.post(
  "/staff/create",
  middlewares_2.verifyAdmin,
  controller_1.createStaff
);
router.get("/staff/all", middlewares_2.verifyAdmin, controller_1.getAllStaff);
router.put(
  "/staff/:staffId/permissions",
  middlewares_2.verifyAdmin,
  controller_1.updateStaffPermissions
);
router.put(
  "/staff/:staffId",
  middlewares_2.verifyAdmin,
  controller_1.updateStaff
);
router.patch(
  "/staff/:staffId/password",
  middlewares_2.verifyAdmin,
  controller_1.updateStaffPassword
);
router.patch(
  "/staff/:staffId/toggle-status",
  middlewares_2.verifyAdmin,
  controller_1.toggleStaffStatus
);
exports.default = router;
