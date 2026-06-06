"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserPasswordByUser = exports.resetPassword = exports.forgotPassword = exports.updateStaffPassword = exports.updateStaff = exports.toggleStaffStatus = exports.updateStaffPermissions = exports.getAllStaff = exports.createStaff = exports.getAllSellerForFilterPage = exports.updateSellerCommission = exports.updateUserPassword = exports.enabledOrDisableSellerByAdmin = exports.promoteUserToSellerByAdmin = exports.updatePassword = exports.updateStatus = exports.allStuffForAdminIndexPage = exports.allForAdminIndexPage = exports.update = exports.getSummaryOfActivity = exports.singleForEditPage = exports.getAuthenticatedUser = exports.getSingleOrder = exports.allOrdersOfUser = exports.logOut = exports.updateUserPersonalInfo = exports.getSingleUserForAddToCartComponent = exports.getContactInfoOfSingleUserBySlug = exports.getStatus = exports.getDetailsOFSingleUserForAdminCustomerDetailsComponent = exports.singleForEditForSellerSettings = exports.getSingleUserById = exports.getSingleUserBySlug = exports.getUserByIdForAdmin = exports.getSingleUser = exports.allUserForAdmin = exports.checkUser_Email = exports.setCookie = exports.logInByCredentials = exports.resendOTP = exports.verifyOTP = exports.signUpByCredentials = void 0;
const user_model_1 = __importDefault(require("./user.model"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const setToken_1 = require("../shared/setToken");
const model_1 = __importDefault(require("../order/model"));
const model_2 = __importDefault(require("../product/model"));
const model_3 = require("../application/model");
const generateSLug_1 = require("../shared/generateSLug");
const otpService_1 = __importDefault(require("../shared/otpService"));
const crypto_1 = __importDefault(require("crypto"));
dotenv_1.default.config();
// controllers/authController.ts
const signUpByCredentials = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { phone, email, slug, password, name } = req.body;
        // 1️⃣ Required fields check
        if (!phone) {
            return res.status(400).json({ message: "Phone is required" });
        }
        if (!password) {
            return res.status(400).json({ message: "Password is required" });
        }
        // 2️⃣ Phone & Email already exists check (parallel)
        const [existingUserByPhone, existingUserByEmail] = yield Promise.all([
            user_model_1.default.findOne({ phone }),
            email ? user_model_1.default.findOne({ email }) : null,
        ]);
        if (existingUserByPhone) {
            return res.status(409).json({ message: "Phone already in use" });
        }
        if (existingUserByEmail) {
            return res.status(409).json({ message: "Email already in use" });
        }
        // 3️⃣ Password hash
        const hashedPwd = yield bcryptjs_1.default.hash(password, 10);
        // 4️⃣ OTP generate
        const otp = otpService_1.default.generateOTP();
        const otpExpiry = otpService_1.default.getOTPExpiry();
        // 5️⃣ Create user
        const user = yield user_model_1.default.create({
            name,
            phone,
            email,
            password: hashedPwd,
            slug: slug || "slug",
            otp,
            otpExpiry,
            isPhoneVerified: false,
        });
        // 6️⃣ Send OTP (non-blocking)
        // const otpSent = await otpService.sendOTP(phone, otp);
        // if (!otpSent) {
        //   console.warn("OTP sending failed, but user created");
        // }
        // 7️⃣ Set refresh token cookie
        const refreshToken = (0, setToken_1.setRefreshTokenCookie)(res, user);
        return res.status(201).json({
            message: "Created successfully",
            user,
            refreshToken,
        });
    }
    catch (err) {
        console.error("Error creating user:", err);
        return res.status(500).json({ message: "Failed to create user" });
    }
});
exports.signUpByCredentials = signUpByCredentials;
const verifyOTP = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
        return res.status(400).json({ message: "Phone and OTP are required" });
    }
    try {
        const user = yield user_model_1.default.findOne({ phone });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (user.isPhoneVerified) {
            return res.status(400).json({ message: "Phone already verified" });
        }
        if (!otpService_1.default.isOTPValid(otp, user.otp, user.otpExpiry)) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }
        user.isPhoneVerified = true;
        yield user.updateOne({ $unset: { otp: 1, otpExpiry: 1 } });
        res.status(200).json({ message: "Phone verified successfully" });
    }
    catch (error) {
        console.error("OTP verification error:", error);
        res.status(500).json({ message: "Failed to verify OTP" });
    }
});
exports.verifyOTP = verifyOTP;
const resendOTP = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { phone } = req.body;
    if (!phone) {
        return res.status(400).json({ message: "Phone is required" });
    }
    try {
        const user = yield user_model_1.default.findOne({ phone });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (user.isPhoneVerified) {
            return res.status(400).json({ message: "Phone already verified" });
        }
        const otp = otpService_1.default.generateOTP();
        const otpExpiry = otpService_1.default.getOTPExpiry();
        user.otp = otp;
        user.otpExpiry = otpExpiry;
        yield user.save();
        // const otpSent = await otpService.sendOTP(phone, otp);
        // if (!otpSent) {
        //   return res.status(500).json({ message: "Failed to send OTP" });
        // }
        res.status(200).json({ message: "OTP sent successfully" });
    }
    catch (error) {
        console.error("Resend OTP error:", error);
        res.status(500).json({ message: "Failed to resend OTP" });
    }
});
exports.resendOTP = resendOTP;
// controllers/authController.ts
const logInByCredentials = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { phone, password } = req.body;
    console.log(req.body);
    if (!phone || !password) {
        return res.status(400).json({ message: "Phone and password are required" });
    }
    try {
        const user = yield user_model_1.default.findOne({ phone }).select("+password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const isMatch = yield bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        const refreshToken = (0, setToken_1.setRefreshTokenCookie)(res, user);
        return res
            .status(200)
            .json({ user, refreshToken, message: "Login successful" });
    }
    catch (err) {
        console.error("Login error:", err);
        return res.status(500).json({ message: "Failed to log in" });
    }
});
exports.logInByCredentials = logInByCredentials;
// Google authentication removed - only phone authentication supported
const setCookie = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { refreshToken, userId } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ message: "No token provided" });
        }
        // Save cookie
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: "none", // allow cross-site
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });
        // 🔑 Fetch user from DB by ID
        const user = yield user_model_1.default.findById(userId).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        return res.json(user);
    }
    catch (error) {
        console.error("Error setting cookie:", error);
        return res.status(500).json({ message: "Server error" });
    }
});
exports.setCookie = setCookie;
// Route to check user authentication
const checkUser_Email = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.status(200).json({
        success: true,
        message: "User authenticated successfully",
        data: req.user, // User object retrieved from middleware
    });
});
exports.checkUser_Email = checkUser_Email;
const allUserForAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { role, search = "", page = 1, limit = 10 } = req.query;
        // Build query object
        const query = {};
        if (role && role !== "all") {
            query.role = role;
        }
        if (search) {
            query.name = { $regex: search, $options: "i" }; // case-insensitive
        }
        const pageNumber = Number(page) || 1;
        const itemsPerPage = Number(limit) || 10;
        const skip = (pageNumber - 1) * itemsPerPage;
        // Fetch users and total count concurrently
        const [users, total] = yield Promise.all([
            user_model_1.default.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(itemsPerPage)
                .select("name slug img image email phone sellerInfo.companyName isEnabledByAdmin sellerInfo.commissionForAdmin role createdAt"),
            user_model_1.default.countDocuments(query),
        ]);
        return res.status(200).json({
            users,
            total,
            page: pageNumber,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            error: "Failed to fetch users",
            message: error.message,
        });
    }
});
exports.allUserForAdmin = allUserForAdmin;
const getSingleUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.params.userId;
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required",
            });
        }
        const user = yield user_model_1.default.findById(userId).select("name personalInfo");
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        return res.status(200).json(user);
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: "An error occurred while fetching the user",
            error: error.message,
        });
    }
});
exports.getSingleUser = getSingleUser;
const getUserByIdForAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.params.userId;
        if (!userId) {
            return res.status(400).json({
                message: "User ID is required",
            });
        }
        const item = yield user_model_1.default.findById(userId);
        console.log(item);
        if (!item) {
            return res.status(404).json({
                message: "User not found",
            });
        }
        return res.status(200).json(item);
    }
    catch (error) {
        return res.status(500).json({
            message: "An error occurred while fetching the user",
            error: error.message,
        });
    }
});
exports.getUserByIdForAdmin = getUserByIdForAdmin;
const getSingleUserBySlug = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userSlug = req.params.userSlug;
        if (!userSlug) {
            return res.status(400).json({
                success: false,
                message: "User ID is required",
            });
        }
        const user = yield user_model_1.default.findOne({ slug: userSlug });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        return res.status(200).json({
            success: true,
            user: user,
            message: "User fetched successfully",
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: "An error occurred while fetching the user",
            error: error.message,
        });
    }
});
exports.getSingleUserBySlug = getSingleUserBySlug;
const getSingleUserById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = req.params.id;
        const item = yield user_model_1.default.findOne({ _id: id });
        res.status(201).json({
            message: "Fetched successfully!",
            resData: item, // Optionally, include the created category in the response
        });
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to Fetch.",
            error: error.message,
        });
    }
});
exports.getSingleUserById = getSingleUserById;
// Get all orders
const singleForEditForSellerSettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield user_model_1.default.findOne({ _id: req.params.id });
        res.status(200).json(user);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching orders", error });
    }
});
exports.singleForEditForSellerSettings = singleForEditForSellerSettings;
// Get all orders
const getDetailsOFSingleUserForAdminCustomerDetailsComponent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.params.id;
        const user = yield user_model_1.default.findOne({ _id: userId });
        // Fetch orders sorted by latest first, only required fields
        // const ordersPromise = Order.find(
        //   { userId },
        //   {
        //     _id: 1,
        //     status: 1,
        //     name: 1,
        //     address: 1,
        //     phone: 1,
        //     cart: 1,
        //     createdAt: 1,
        //   }
        // )
        //   .sort({ _id: -1 }) // Sorting at DB level instead of `.reverse()`
        //   .lean();
        // Inside your controller
        const userObjectId = new mongoose_1.default.Types.ObjectId(userId); // Ensure it's an ObjectId
        // Fetch all counts in parallel using Promise.all
        const [totalOrders, orderStatusCounts] = yield Promise.all([
            model_1.default.countDocuments({ userId: userObjectId }),
            model_1.default.aggregate([
                {
                    $match: { userId: userObjectId }, // Use the correct ObjectId variable
                },
                {
                    $group: {
                        _id: "$status", // Group by order status
                        count: { $sum: 1 }, // Count each status
                    },
                },
            ]),
        ]);
        // Convert aggregation result into a map of status counts
        const counts = orderStatusCounts.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {});
        // Extract specific statuses, default to 0 if not present
        const totalPendingOrder = counts["Pending"] || 0;
        const totalApprovedOrder = counts["Approved"] || 0;
        const totalShippedOrder = counts["Shipped"] || 0;
        const totalCanceledOrder = counts["Cancelled"] || 0;
        const totalDeliveredOrder = counts["Delivered"] || 0;
        // Calculate total orders by summing up status counts
        const totalOrderNumber = totalPendingOrder +
            totalApprovedOrder +
            totalShippedOrder +
            totalCanceledOrder +
            totalDeliveredOrder;
        // Resolve orders from promise
        // const orders = await ordersPromise;
        // Response data
        const data = {
            user,
            // orders,
            totalOrders,
            totalPendingOrder,
            totalApprovedOrder,
            totalShippedOrder,
            totalCanceledOrder,
            totalDeliveredOrder,
            totalOrderNumber,
        };
        res
            .status(200)
            .json({ success: true, resData: data, message: "Successfully fetched" });
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching orders", error });
    }
});
exports.getDetailsOFSingleUserForAdminCustomerDetailsComponent = getDetailsOFSingleUserForAdminCustomerDetailsComponent;
const getStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userSlug = req.params.userSlug;
        if (!userSlug) {
            return res.status(400).json({
                success: false,
                message: "User ID is required",
            });
        }
        const user = yield user_model_1.default.findOne({ slug: userSlug }).select("isEnabledByAdmin");
        return res.status(200).json({
            success: true,
            user: user,
            message: "User fetched successfully",
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: "An error occurred while fetching the user",
            error: error.message,
        });
    }
});
exports.getStatus = getStatus;
const getContactInfoOfSingleUserBySlug = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userSlug = req.params.userSlug;
        if (!userSlug) {
            return res.status(400).json({
                success: false,
                message: "User ID is required",
            });
        }
        const user = yield user_model_1.default.findOne({ slug: userSlug });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        return res.status(200).json({
            success: true,
            user: user,
            message: "User fetched successfully",
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: "An error occurred while fetching the user",
            error: error.message,
        });
    }
});
exports.getContactInfoOfSingleUserBySlug = getContactInfoOfSingleUserBySlug;
const getSingleUserForAddToCartComponent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.params.id;
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required",
            });
        }
        const item = yield user_model_1.default.findOne({ _id: userId }).select("isOneClickPayOffer oneClickPayStartedAt coins name email phone address");
        if (!item) {
            return res.status(404).json({
                message: "Data not found",
            });
        }
        return res.status(200).json({
            resData: item,
            message: "Fetched successfully",
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: "An error occurred while fetching the user",
            error: error.message,
        });
    }
});
exports.getSingleUserForAddToCartComponent = getSingleUserForAddToCartComponent;
const updateUserPersonalInfo = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.params.userId;
        const { name, address, image, birthday, gender } = req.body;
        // Build the update object dynamically
        const updateData = {
            name,
            address,
            image,
            birthday,
            gender,
        };
        // Update user
        const updatedUser = yield user_model_1.default.findByIdAndUpdate(userId, {
            name,
            personalInfo: {
                image,
                birthday,
                gender,
                address,
            },
        }, { new: true, runValidators: true });
        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        (0, setToken_1.setRefreshTokenCookie)(res, updatedUser);
        return res.status(200).json({
            success: true,
            message: "User updated successfully",
            user: updatedUser,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "User update failed, please try again",
        });
    }
});
exports.updateUserPersonalInfo = updateUserPersonalInfo;
const logOut = (req, res) => {
    res.clearCookie("refreshToken", {
        path: "/", // Ensure this matches the path where the cookie was set
        httpOnly: true,
        secure: true, // Use `secure: true` in production when using HTTPS
        sameSite: "none", // Adjust based on your needs (e.g., Lax or Strict)
    });
    res.status(200).json({ message: "Logged out successfully" });
};
exports.logOut = logOut;
// Get a single order by ID
const allOrdersOfUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const user = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const orders = yield model_1.default.find({ user }).sort({ createdAt: -1 });
        if (!orders) {
            res
                .status(200)
                .json({ success: false, message: "Order not found", orders });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Order received successfully",
            orders: orders,
        });
    }
    catch (error) {
        res
            .status(500)
            .json({ success: true, message: "Error retrieving order", error });
    }
});
exports.allOrdersOfUser = allOrdersOfUser;
// Get a single order by ID
const getSingleOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const order = yield model_1.default.findById({
            _id: req.params.id,
            userId: (_a = req === null || req === void 0 ? void 0 : req.user) === null || _a === void 0 ? void 0 : _a._id,
        });
        if (!order) {
            res.status(404).json({ message: "Order not found" });
            return;
        }
        res.status(200).json(order);
    }
    catch (error) {
        res.status(500).json({ message: "Error retrieving order", error });
    }
});
exports.getSingleOrder = getSingleOrder;
const getAuthenticatedUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const email = req.query.email;
        const item = yield user_model_1.default.findOne({ email: email });
        res.status(200).json({
            message: "Fetched successfully!",
            resData: item,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to fetch.",
            error: error.message,
        });
    }
});
exports.getAuthenticatedUser = getAuthenticatedUser;
// Get single
const singleForEditPage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const item = yield user_model_1.default.findOne({ _id: req.params.id });
        res.status(200).json({
            message: "Fetched successfully!",
            resData: item,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to fetch.",
            error: error.message,
        });
    }
});
exports.singleForEditPage = singleForEditPage;
// Get single
const getSummaryOfActivity = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        // Fetch the last 5 orders (sorted by most recent first)
        const orders = yield model_1.default.find({ userId })
            .sort({ createdAt: -1 })
            .limit(5);
        res.status(200).json({
            success: true,
            message: "Fetched successfully!",
            resData: { orders },
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to fetch.",
            error: error.message,
            resData: null,
        });
    }
});
exports.getSummaryOfActivity = getSummaryOfActivity;
// Update
const update = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const updatedItem = yield user_model_1.default.findByIdAndUpdate(id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!updatedItem) {
            return res.status(404).json({
                message: "Not found.",
            });
        }
        res.status(200).json({
            message: "Updated successfully!",
            resData: updatedItem,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to update.",
            error: error.message,
        });
    }
});
exports.update = update;
const allForAdminIndexPage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const items = yield user_model_1.default.find({ role: "user" }); // Adjust the query as needed
        res
            .status(200)
            .json({ message: "Fetched successfully!", resData: items.reverse() });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch.", error: error.message });
    }
});
exports.allForAdminIndexPage = allForAdminIndexPage;
const allStuffForAdminIndexPage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const items = yield user_model_1.default.find({
            role: { $in: ["seller", "customerManager"] },
        });
        res
            .status(200)
            .json({ message: "Fetched successfully!", resData: items.reverse() });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch.", error: error.message });
    }
});
exports.allStuffForAdminIndexPage = allStuffForAdminIndexPage;
// Update the status  by ID
const updateStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params; // Make sure the ID is being passed correctly
    const { display } = req.body;
    try {
        const updateItem = yield user_model_1.default.findByIdAndUpdate(id, { display }, // Ensure 'status' is the correct field
        { new: true } // Return the updated document
        );
        if (!updateItem) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({
            message: "User status updated successfully",
            data: updateItem,
        });
    }
    catch (error) {
        res.status(500).json({
            message: "Error updating User status",
            error: error.message,
        });
    }
});
exports.updateStatus = updateStatus;
// Update the status  by ID
const updatePassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params; // Make sure the ID is being passed correctly
    const { password } = req.body;
    const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
    try {
        const updateItem = yield user_model_1.default.findByIdAndUpdate(id, { password: hashedPassword }, // Ensure 'status' is the correct field
        { new: true } // Return the updated document
        );
        if (!updateItem) {
            return res
                .status(404)
                .json({ success: false, message: "Not found", resData: null });
        }
        res.status(200).json({
            success: true,
            message: "Updated successfully",
            resData: updateItem,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Error updating User status",
            error: error.message,
        });
    }
});
exports.updatePassword = updatePassword;
// Update the status of a PageElement by ID
const promoteUserToSellerByAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const { applicationId } = req.params;
        // Find application
        const application = yield model_3.SellerApplication.findById(applicationId).populate("user");
        if (!application) {
            return res.status(404).json({ message: "Application not found" });
        }
        application.status = "approved";
        yield application.save();
        // ✅ If approved, update user with application details
        //@ts-ignore
        yield user_model_1.default.findByIdAndUpdate(application.user._id, {
            role: "seller",
            isEnabledByAdmin: true,
            sellerInfo: {
                commission: 10,
                companyName: application.companyName,
                companyEmail: application.companyEmail,
                companyPhone: application.companyPhone,
                companyFacebook: application.companyFacebook,
                companyWhatsapp: application.companyWhatsapp,
                companyCoverImg: application.companyCoverImg,
                companyProfileImg: application.companyProfileImg,
                firstContactPersonName: application.firstContactPersonName,
                firstContactPersonPhone: application.firstContactPersonPhone,
                secondContactPersonName: application.secondContactPersonName,
                secondContactPersonPhone: application.secondContactPersonPhone,
            },
        });
        return res.json({
            message: `Application approved successfully`,
            application,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.promoteUserToSellerByAdmin = promoteUserToSellerByAdmin;
const enabledOrDisableSellerByAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { sellerId } = req.params;
    const { isEnabledByAdmin } = req.body;
    console.log(isEnabledByAdmin, sellerId);
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        // 1️⃣ Update User
        const updatedSeller = yield user_model_1.default.findByIdAndUpdate(sellerId, { isEnabledByAdmin }, { new: true, session });
        if (!updatedSeller) {
            yield session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: "User not found" });
        }
        // 2️⃣ Update all products of this seller
        yield model_2.default.updateMany({ seller: sellerId }, { $set: { isEnabledByAdmin } }, { session });
        // 3️⃣ Commit transaction (everything saved)
        yield session.commitTransaction();
        session.endSession();
        return res.status(200).json({
            message: "User + Products updated successfully",
            data: updatedSeller,
        });
    }
    catch (error) {
        // ❌ If error happens anywhere → rollback
        yield session.abortTransaction();
        session.endSession();
        return res.status(500).json({
            message: "Transaction failed. Nothing was updated.",
            error: error.message,
        });
    }
});
exports.enabledOrDisableSellerByAdmin = enabledOrDisableSellerByAdmin;
// Update the status of a PageElement by ID
const updateUserPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params; // Make sure the ID is being passed correctly
    const { password } = req.body;
    try {
        const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
        const updatedUser = yield user_model_1.default.findByIdAndUpdate(userId, { password: hashedPassword }, { new: true });
        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({
            message: "User password updated successfully",
            data: updatedUser,
        });
    }
    catch (error) {
        res.status(500).json({
            message: "Error updating User password",
            error: error.message,
        });
    }
});
exports.updateUserPassword = updateUserPassword;
const updateSellerCommission = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    const { commission } = req.body;
    try {
        const updatedUser = yield user_model_1.default.findByIdAndUpdate(userId, { "sellerInfo.commissionForAdmin": commission }, { new: true });
        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({
            message: "Seller commission updated successfully",
            data: updatedUser,
        });
    }
    catch (error) {
        res.status(500).json({
            message: "Error updating Seller commission",
            error: error.message,
        });
    }
});
exports.updateSellerCommission = updateSellerCommission;
// ✅ GET all sellers for filter page
const getAllSellerForFilterPage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const sellers = yield user_model_1.default.find({ role: "seller", display: true }, { _id: 1, slug: 1, companyName: 1, image: 1, name: 1 }).sort({ companyName: 1 }); // sort alphabetically
        res.status(200).json({ sellers });
    }
    catch (error) {
        console.error("Error fetching sellers:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});
exports.getAllSellerForFilterPage = getAllSellerForFilterPage;
// =================== Staff Management ===================
const createStaff = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { name, email, phone, password, permissions } = req.body;
        const adminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!name || !password || (!email && !phone)) {
            return res.status(400).json({ message: "Required fields missing" });
        }
        const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
        const slug = (0, generateSLug_1.generateSlug)(name);
        const staff = new user_model_1.default({
            name,
            email,
            phone,
            password: hashedPassword,
            role: "staff",
            slug,
            staffInfo: {
                permissions: {
                    productManagement: (permissions === null || permissions === void 0 ? void 0 : permissions.productManagement) || false,
                    orderManagement: (permissions === null || permissions === void 0 ? void 0 : permissions.orderManagement) || false,
                },
                assignedBy: adminId,
                assignedAt: new Date(),
            },
        });
        yield staff.save();
        res
            .status(201)
            .json({ success: true, message: "Staff created successfully", staff });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.createStaff = createStaff;
const getAllStaff = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const staff = yield user_model_1.default.find({ role: "staff" })
            .select("name email phone staffInfo isEnabledByAdmin createdAt")
            .populate("staffInfo.assignedBy", "name")
            .sort({ createdAt: -1 });
        res.json({ success: true, data: staff });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.getAllStaff = getAllStaff;
const updateStaffPermissions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { staffId } = req.params;
        const { permissions } = req.body;
        const staff = yield user_model_1.default.findByIdAndUpdate(staffId, {
            "staffInfo.permissions": permissions,
        }, { new: true });
        if (!staff) {
            return res
                .status(404)
                .json({ success: false, message: "Staff not found" });
        }
        res.json({ success: true, message: "Permissions updated", staff });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.updateStaffPermissions = updateStaffPermissions;
const toggleStaffStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { staffId } = req.params;
        const staff = yield user_model_1.default.findById(staffId);
        if (!staff) {
            return res
                .status(404)
                .json({ success: false, message: "Staff not found" });
        }
        staff.isEnabledByAdmin = !staff.isEnabledByAdmin;
        yield staff.save();
        res.json({ success: true, message: "Staff status updated", staff });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.toggleStaffStatus = toggleStaffStatus;
const updateStaff = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { staffId } = req.params;
        const { name, email, phone, permissions } = req.body;
        const updateData = {};
        if (name)
            updateData.name = name;
        if (email)
            updateData.email = email;
        if (phone)
            updateData.phone = phone;
        if (permissions)
            updateData["staffInfo.permissions"] = permissions;
        const staff = yield user_model_1.default.findByIdAndUpdate(staffId, updateData, {
            new: true,
        });
        if (!staff) {
            return res
                .status(404)
                .json({ success: false, message: "Staff not found" });
        }
        res.json({ success: true, message: "Staff updated successfully", staff });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.updateStaff = updateStaff;
const updateStaffPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { staffId } = req.params;
        const { password } = req.body;
        if (!password) {
            return res
                .status(400)
                .json({ success: false, message: "Password is required" });
        }
        const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
        const staff = yield user_model_1.default.findByIdAndUpdate(staffId, { password: hashedPassword }, { new: true });
        if (!staff) {
            return res
                .status(404)
                .json({ success: false, message: "Staff not found" });
        }
        res.json({ success: true, message: "Password updated successfully" });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.updateStaffPassword = updateStaffPassword;
const forgotPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { phone } = req.body;
        if (!phone) {
            return res.status(400).json({ message: "Phone is required" });
        }
        const user = yield user_model_1.default.findOne({ phone });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const resetToken = crypto_1.default.randomBytes(32).toString("hex");
        const resetTokenExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpiry = resetTokenExpiry;
        yield user.save();
        res.json(Object.assign({ message: "Password reset link sent successfully" }, (process.env.NODE_ENV === "development" && { resetToken })));
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.forgotPassword = forgotPassword;
// Reset Password
const resetPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res
                .status(400)
                .json({ message: "Token and new password are required" });
        }
        if (newPassword.length < 6) {
            return res
                .status(400)
                .json({ message: "Password must be at least 6 characters" });
        }
        // Find user with valid reset token
        const user = yield user_model_1.default.findOne({
            resetPasswordToken: token,
            resetPasswordExpiry: { $gt: new Date() },
        });
        if (!user) {
            return res
                .status(400)
                .json({ message: "Invalid or expired reset token" });
        }
        // Hash new password and update user
        const hashedPassword = yield bcryptjs_1.default.hash(newPassword, 10);
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpiry = undefined;
        yield user.save();
        res.json({ message: "Password reset successfully" });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.resetPassword = resetPassword;
// Update Password for Logged-in User
const updateUserPasswordByUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!currentPassword || !newPassword) {
            return res
                .status(400)
                .json({ message: "Current password and new password are required" });
        }
        if (newPassword.length < 6) {
            return res
                .status(400)
                .json({ message: "New password must be at least 6 characters" });
        }
        // Find user
        const user = yield user_model_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        // Verify current password
        const isCurrentPasswordValid = yield bcryptjs_1.default.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({ message: "Current password is incorrect" });
        }
        // Check if new password is different
        const isSamePassword = yield bcryptjs_1.default.compare(newPassword, user.password);
        if (isSamePassword) {
            return res.status(400).json({
                message: "New password must be different from current password",
            });
        }
        // Hash and update new password
        const hashedNewPassword = yield bcryptjs_1.default.hash(newPassword, 10);
        user.password = hashedNewPassword;
        yield user.save();
        res.json({ message: "Password updated successfully" });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.updateUserPasswordByUser = updateUserPasswordByUser;
