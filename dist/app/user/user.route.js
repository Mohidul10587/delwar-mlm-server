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
const user_controller_1 = require("./user.controller");
const middlewares_1 = require("./middlewares");
const reusableControllers_1 = require("../shared/reusableControllers");
const user_model_1 = __importDefault(require("./user.model"));
const middlewares_2 = require("./middlewares");
const router = express_1.default.Router();
//=================== For user ===================
router.get("/singleUser/:userId", user_controller_1.getSingleUser);
router.get(
  "/getUserByIdForAdmin/:userId",
  user_controller_1.getUserByIdForAdmin
);
router.get(
  "/getSingleUserBySlug/:userSlug",
  user_controller_1.getSingleUserBySlug
);
router.get("/getSingleUserById/:id", user_controller_1.getSingleUserById);
router.get("/sellerStatus/:userSlug", user_controller_1.getStatus);
router.get(
  "/singleForEditPage/:id",
  middlewares_1.verifyUser,
  user_controller_1.singleForEditPage
);
router.get(
  "/getSummaryOfActivity",
  middlewares_1.verifyUser,
  user_controller_1.getSummaryOfActivity
);
router.put("/update/:id", middlewares_1.verifyUser, user_controller_1.update);
//================For user authentication ===================
router.get("/getAuthenticatedUser", user_controller_1.getAuthenticatedUser);
router.post(
  "/signUpByCredentials",
  phoneValidationMiddleware_1.validatePhoneMiddleware,
  user_controller_1.signUpByCredentials
);
router.post("/verifyOTP", user_controller_1.verifyOTP);
router.post("/resendOTP", user_controller_1.resendOTP);
router.post(
  "/logInByCredentials",
  phoneValidationMiddleware_1.validatePhoneMiddleware,
  user_controller_1.logInByCredentials
);
// Google authentication removed - only phone authentication supported
router.post("/setCookie", user_controller_1.setCookie);
router.post("/logout", user_controller_1.logOut);
router.post(
  "/forgot-password",
  phoneValidationMiddleware_1.validatePhoneMiddleware,
  user_controller_1.forgotPassword
);
router.post("/reset-password", user_controller_1.resetPassword);
router.patch(
  "/update-password",
  middlewares_1.verifyUser,
  user_controller_1.updateUserPasswordByUser
);
//===================== For Admin=====================
router.get(
  "/getAllSellerForFilterPage",
  user_controller_1.getAllSellerForFilterPage
);
router.get(
  "/allUserForAdmin",
  middlewares_2.verifyAdmin,
  user_controller_1.allUserForAdmin
);
router.get(
  "/singleForEditForSellerSettings/:id",
  user_controller_1.singleForEditForSellerSettings
);
router.patch(
  "/promoteUserToSellerByAdmin/:applicationId",
  middlewares_2.verifyAdmin,
  user_controller_1.promoteUserToSellerByAdmin
);
router.patch(
  "/enabledOrDisableSellerByAdmin/:sellerId",
  middlewares_2.verifyAdmin,
  user_controller_1.enabledOrDisableSellerByAdmin
);
router.patch(
  "/updateUserPassword/:userId",
  middlewares_2.verifyAdmin,
  user_controller_1.updateUserPassword
);
router.patch(
  "/updateSellerCommission/:userId",
  middlewares_2.verifyAdmin,
  user_controller_1.updateSellerCommission
);
router.get(
  "/getDetailsOFSingleUserForAdminCustomerDetailsComponent/:id",
  // verifyAdmin,
  user_controller_1.getDetailsOFSingleUserForAdminCustomerDetailsComponent
);
router.get(
  "/check-user-email",
  middlewares_1.verifyUser,
  user_controller_1.checkUser_Email
);
router.get(
  "/checkStuff",
  middlewares_2.verifyStuffToken,
  user_controller_1.checkUser_Email
);
router.get(
  "/allOrdersOfUser",
  middlewares_1.verifyUser,
  user_controller_1.allOrdersOfUser
);
router.get(
  "/getSingleOrder/:id",
  middlewares_1.verifyUser,
  user_controller_1.getSingleOrder
);
router.get(
  "/allForAdminIndexPage",
  middlewares_2.verifyAdmin,
  user_controller_1.allForAdminIndexPage
);
router.get(
  "/allStuffForAdminIndexPage",
  middlewares_2.verifyAdmin,
  user_controller_1.allStuffForAdminIndexPage
);
router.get(
  "/getContactInfoOfSingleUserBySlug/:userSlug",
  user_controller_1.getContactInfoOfSingleUserBySlug
);
router.get(
  "/getSingleUserForAddToCartComponent/:id",
  user_controller_1.getSingleUserForAddToCartComponent
);
router.patch(
  "/updateUserPersonalInfo/:userId",
  middlewares_1.verifyUser,
  user_controller_1.updateUserPersonalInfo
);
router.patch(
  "/updateStatus/:id",
  middlewares_2.verifyAdmin,
  user_controller_1.updateStatus
);
router.patch(
  "/updatePassword/:id",
  middlewares_2.verifyAdmin,
  user_controller_1.updatePassword
);
router.delete(
  "/delete/:id",
  middlewares_2.verifyAdmin,
  (0, reusableControllers_1.deleteById)(user_model_1.default)
);
//===================== Staff Management =====================
router.post(
  "/staff/create",
  middlewares_2.verifyAdmin,
  user_controller_1.createStaff
);
router.get(
  "/staff/all",
  middlewares_2.verifyAdmin,
  user_controller_1.getAllStaff
);
router.put(
  "/staff/:staffId/permissions",
  middlewares_2.verifyAdmin,
  user_controller_1.updateStaffPermissions
);
router.put(
  "/staff/:staffId",
  middlewares_2.verifyAdmin,
  user_controller_1.updateStaff
);
router.patch(
  "/staff/:staffId/password",
  middlewares_2.verifyAdmin,
  user_controller_1.updateStaffPassword
);
router.patch(
  "/staff/:staffId/toggle-status",
  middlewares_2.verifyAdmin,
  user_controller_1.toggleStaffStatus
);
exports.default = router;
