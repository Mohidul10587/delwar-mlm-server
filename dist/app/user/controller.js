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
exports.updatePermissions = exports.getLinkedAccounts = exports.updateInfo = exports.adminUpdateRelations = exports.deleteUser = exports.getUsers = exports.getUserDetails = exports.adminUpdatePassword = exports.adminUpdatePhone = exports.toggleUserActive = exports.changePassword = exports.updatePhone = exports.updateImage = exports.updateCoverImage = exports.switchAccount = exports.verify = exports.logout = exports.refresh = exports.login = exports.adminRegister = exports.register = void 0;
const model_1 = require("./model");
const model_2 = require("../wallet/model");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const validation_1 = require("./validation");
const authConfig_1 = require("../../utils/authConfig");
const defaultPermissionsByRole = {
    admin: ["purchase.review"],
    staff: ["purchase.review"],
};
const generateTokens = (id) => {
    const accessToken = jsonwebtoken_1.default.sign({ id }, authConfig_1.JWT_SECRET, { expiresIn: "30m" });
    const refreshToken = jsonwebtoken_1.default.sign({ id }, authConfig_1.JWT_REFRESH_SECRET, {
        expiresIn: "1d",
    });
    return { accessToken, refreshToken };
};
/** Build generation ancestor list (no side needed). */
function buildGenerationAncestors(referrerId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (!referrerId)
            return [];
        const parent = yield model_1.User.findById(referrerId)
            .select("generationAncestors")
            .lean();
        if (!parent)
            return [];
        const parentAncestors = ((_a = parent.generationAncestors) !== null && _a !== void 0 ? _a : []).map((a) => ({
            level: a.level + 1,
            userId: a.userId,
        }));
        return [{ level: 1, userId: referrerId }, ...parentAncestors];
    });
}
/**
 * Cascade generation ancestor updates to all referral descendants (BFS).
 * Finds children by generationAncestors[0].userId === rootId.
 */
function cascadeGenerationAncestors(rootId) {
    return __awaiter(this, void 0, void 0, function* () {
        let queue = [rootId];
        while (queue.length > 0) {
            const children = yield model_1.User.find({
                "generationAncestors.0.userId": { $in: queue },
            })
                .select("_id generationAncestors")
                .lean();
            if (children.length === 0)
                break;
            yield Promise.all(children.map((child) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b;
                const parentId = (_b = (_a = child.generationAncestors) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.userId;
                const newAncestors = yield buildGenerationAncestors(parentId);
                return model_1.User.updateOne({ _id: child._id }, { $set: { generationAncestors: newAncestors } });
            })));
            queue = children.map((c) => c._id);
        }
    });
}
const register = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, username, phone, password, referrerUsername } = validation_1.registerSchema.parse(req.body);
        const existingUsername = yield model_1.User.findOne({ username });
        if (existingUsername)
            return res.status(400).json({ message: "Username already taken" });
        let referrerId = null;
        if (referrerUsername) {
            const referrer = yield model_1.User.findOne({
                username: referrerUsername,
            }).select("_id");
            if (!referrer)
                return res.status(400).json({ message: "Referrer not found" });
            referrerId = referrer._id;
        }
        const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
        const generationAncestors = yield buildGenerationAncestors(referrerId);
        const user = yield model_1.User.create({
            name,
            username,
            phone,
            password: hashedPassword,
            generationAncestors,
        });
        yield model_2.Wallet.create({ userId: user._id });
        const siblings = yield model_1.User.find({ phone, _id: { $ne: user._id } }).select("_id");
        if (siblings.length > 0) {
            const siblingIds = siblings.map((s) => s._id);
            yield model_1.User.updateMany({ _id: { $in: siblingIds } }, { $addToSet: { linkedPhoneAccounts: user._id } });
            user.linkedPhoneAccounts = siblingIds;
            yield user.save();
        }
        const { accessToken, refreshToken } = generateTokens(user._id.toString());
        res.cookie("accessToken", accessToken, (0, authConfig_1.cookieOpts)());
        res.cookie("refreshToken", refreshToken, (0, authConfig_1.cookieOpts)());
        res.status(201).json({ message: "Registered successfully", user });
    }
    catch (err) {
        next(err);
    }
});
exports.register = register;
// Helper: resolve username → ObjectId
const resolveUsername = (username, label, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!username)
        return { id: null, error: false };
    const found = yield model_1.User.findOne({ username }).select("_id");
    if (!found) {
        res.status(400).json({ message: `${label} not found` });
        return { id: null, error: true };
    }
    return { id: found._id, error: false };
});
const adminRegister = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { name, username, phone, password, referrerUsername, role } = validation_1.adminRegisterSchema.parse(req.body);
        const existingUsername = yield model_1.User.findOne({ username });
        if (existingUsername)
            return res.status(400).json({ message: "Username already taken" });
        const { id: referrerId, error: refErr } = yield resolveUsername(referrerUsername, "Referrer", res);
        if (refErr)
            return;
        const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
        const generationAncestors = yield buildGenerationAncestors(referrerId);
        const user = yield model_1.User.create({
            name,
            username,
            phone,
            password: hashedPassword,
            role,
            permissions: (_a = defaultPermissionsByRole[role]) !== null && _a !== void 0 ? _a : [],
            generationAncestors,
        });
        yield model_2.Wallet.create({ userId: user._id });
        const siblings = yield model_1.User.find({ phone, _id: { $ne: user._id } }).select("_id");
        if (siblings.length > 0) {
            const siblingIds = siblings.map((s) => s._id);
            yield model_1.User.updateMany({ _id: { $in: siblingIds } }, { $addToSet: { linkedPhoneAccounts: user._id } });
            user.linkedPhoneAccounts = siblingIds;
            yield user.save();
        }
        res.status(201).json({ message: "User registered successfully", user });
    }
    catch (err) {
        next(err);
    }
});
exports.adminRegister = adminRegister;
const login = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username, password } = validation_1.loginSchema.parse(req.body);
        const user = yield model_1.User.findOne({ username });
        if (!user)
            return res.status(404).json({ message: "User not found" });
        if (!user.isActive)
            return res.status(403).json({ message: "Account is inactive" });
        const isValid = yield bcryptjs_1.default.compare(password, user.password);
        if (!isValid)
            return res.status(401).json({ message: "Invalid password" });
        const { accessToken, refreshToken } = generateTokens(user._id.toString());
        res.cookie("accessToken", accessToken, (0, authConfig_1.cookieOpts)());
        res.cookie("refreshToken", refreshToken, (0, authConfig_1.cookieOpts)());
        res.json({ message: "Login successful", user });
    }
    catch (err) {
        next(err);
    }
});
exports.login = login;
const refresh = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const token = req.cookies.refreshToken;
        if (!token)
            return res.status(401).json({ message: "No refresh token" });
        const decoded = jsonwebtoken_1.default.verify(token, authConfig_1.JWT_REFRESH_SECRET);
        const user = yield model_1.User.findById(decoded.id).select("-password");
        if (!user)
            return res.status(401).json({ message: "Invalid refresh token" });
        const newAccessToken = jsonwebtoken_1.default.sign({ id: user._id.toString() }, authConfig_1.JWT_SECRET, {
            expiresIn: "30m",
        });
        res.cookie("accessToken", newAccessToken, (0, authConfig_1.cookieOpts)());
        res.json({ success: true, user });
    }
    catch (_a) {
        res.status(401).json({ message: "Refresh failed" });
    }
});
exports.refresh = refresh;
const logout = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.clearCookie("accessToken", (0, authConfig_1.cookieOpts)());
        res.clearCookie("refreshToken", (0, authConfig_1.cookieOpts)());
        res.json({ message: "Logged out successfully" });
    }
    catch (error) {
        next(error);
    }
});
exports.logout = logout;
const verify = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const token = req.cookies.accessToken;
        if (!token)
            return res.status(401).json({ message: "No token provided" });
        const decoded = jsonwebtoken_1.default.verify(token, authConfig_1.JWT_SECRET);
        const user = yield model_1.User.findById(decoded.id).select("-password");
        if (!user)
            return res.status(404).json({ message: "User not found" });
        res.json({ user });
    }
    catch (_a) {
        res.status(401).json({ message: "Invalid token" });
    }
});
exports.verify = verify;
// Switch to another linked account (same phone number) without re-login (rule 6)
const switchAccount = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { targetUserId } = req.params;
        const currentUser = req.user;
        const isLinked = currentUser.linkedPhoneAccounts.some((id) => id.toString() === targetUserId);
        if (!isLinked)
            return res.status(403).json({ message: "Account not linked" });
        const targetUser = yield model_1.User.findById(targetUserId).select("-password");
        if (!targetUser)
            return res.status(404).json({ message: "Target account not found" });
        if (!targetUser.isActive)
            return res.status(403).json({ message: "Target account is inactive" });
        const { accessToken, refreshToken } = generateTokens(targetUser._id.toString());
        res.cookie("accessToken", accessToken, (0, authConfig_1.cookieOpts)());
        res.cookie("refreshToken", refreshToken, (0, authConfig_1.cookieOpts)());
        res.json({ message: "Switched account", user: targetUser });
    }
    catch (err) {
        next(err);
    }
});
exports.switchAccount = switchAccount;
const updateCoverImage = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { coverImage } = req.body;
        if (!coverImage)
            return res.status(400).json({ message: "Cover image URL required" });
        const user = yield model_1.User.findByIdAndUpdate((_a = req.user) === null || _a === void 0 ? void 0 : _a._id, { $set: { coverImage } }, { new: true }).select("-password");
        if (!user)
            return res.status(404).json({ message: "User not found" });
        res.json({ message: "Cover image updated", user });
    }
    catch (err) {
        next(err);
    }
});
exports.updateCoverImage = updateCoverImage;
const updateImage = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { image } = req.body;
        if (!image)
            return res.status(400).json({ message: "Image URL required" });
        const user = yield model_1.User.findByIdAndUpdate((_a = req.user) === null || _a === void 0 ? void 0 : _a._id, { $set: { image } }, { new: true }).select("-password");
        if (!user)
            return res.status(404).json({ message: "User not found" });
        res.json({ message: "Image updated", user });
    }
    catch (err) {
        next(err);
    }
});
exports.updateImage = updateImage;
const updatePhone = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { phone } = req.body;
        // M-12 fix: basic phone validation
        if (!phone || !/^[0-9+\-\s]{7,15}$/.test(String(phone).trim())) {
            return res.status(400).json({ message: "Invalid phone number format" });
        }
        const user = yield model_1.User.findByIdAndUpdate((_a = req.user) === null || _a === void 0 ? void 0 : _a._id, { $set: { phone: String(phone).trim() } }, { new: true }).select("-password");
        if (!user)
            return res.status(404).json({ message: "User not found" });
        res.json({ message: "Phone updated", user });
    }
    catch (err) {
        next(err);
    }
});
exports.updatePhone = updatePhone;
const changePassword = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { currentPassword, newPassword } = req.body;
        const user = yield model_1.User.findById((_a = req.user) === null || _a === void 0 ? void 0 : _a._id);
        if (!user)
            return res.status(404).json({ message: "User not found" });
        const isValid = yield bcryptjs_1.default.compare(currentPassword, user.password);
        if (!isValid)
            return res.status(401).json({ message: "Current password is incorrect" });
        user.password = yield bcryptjs_1.default.hash(newPassword, 10);
        yield user.save();
        res.json({ message: "Password changed" });
    }
    catch (err) {
        next(err);
    }
});
exports.changePassword = changePassword;
const toggleUserActive = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield model_1.User.findById(req.params.id).select("-password");
        if (!user)
            return res.status(404).json({ message: "User not found" });
        user.isActive = !user.isActive;
        yield user.save();
        res.json({
            message: user.isActive ? "User activated" : "User disabled",
            user,
        });
    }
    catch (err) {
        next(err);
    }
});
exports.toggleUserActive = toggleUserActive;
const adminUpdatePhone = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { phone } = req.body;
        const user = yield model_1.User.findByIdAndUpdate(req.params.id, { $set: { phone } }, { new: true }).select("-password");
        if (!user)
            return res.status(404).json({ message: "User not found" });
        res.json({ message: "Phone updated", user });
    }
    catch (err) {
        next(err);
    }
});
exports.adminUpdatePhone = adminUpdatePhone;
const adminUpdatePassword = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { password } = req.body;
        if (!password)
            return res.status(400).json({ message: "Password required" });
        const hashed = yield bcryptjs_1.default.hash(password, 10);
        const user = yield model_1.User.findByIdAndUpdate(req.params.id, { $set: { password: hashed } }, { new: true }).select("-password");
        if (!user)
            return res.status(404).json({ message: "User not found" });
        res.json({ message: "Password updated" });
    }
    catch (err) {
        next(err);
    }
});
exports.adminUpdatePassword = adminUpdatePassword;
const getUserDetails = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const user = yield model_1.User.findById(req.params.id).select("-password").lean();
        if (!user)
            return res.status(404).json({ message: "User not found" });
        const referrerId = (_b = (_a = user.generationAncestors) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.userId;
        const referrer = referrerId
            ? yield model_1.User.findById(referrerId).select("name username phone").lean()
            : null;
        const wallet = yield model_2.Wallet.findOne({ userId: user._id }).lean();
        res.json({ user: Object.assign(Object.assign({}, user), { referrer }), wallet });
    }
    catch (err) {
        next(err);
    }
});
exports.getUserDetails = getUserDetails;
const getUsers = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || "";
        const skip = (page - 1) * limit;
        const query = {};
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { phone: { $regex: search, $options: "i" } },
                { username: { $regex: search, $options: "i" } },
            ];
        }
        const [users, total] = yield Promise.all([
            model_1.User.find(query)
                .select("-password")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            model_1.User.countDocuments(query),
        ]);
        res.json({ users, total, page, pages: Math.ceil(total / limit) });
    }
    catch (error) {
        next(error);
    }
});
exports.getUsers = getUsers;
const deleteUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield model_1.User.findById(req.params.id);
        if (!user)
            return res.status(404).json({ message: "User not found" });
        // ⚠️ FUTURE: if admin deletion should be allowed, remove "admin" from this guard.
        if (user.role === "superadmin" || user.role === "admin")
            return res.status(403).json({ message: "Cannot delete superadmin or admin" });
        yield model_1.User.findByIdAndDelete(req.params.id);
        res.json({ message: "User deleted" });
    }
    catch (err) {
        next(err);
    }
});
exports.deleteUser = deleteUser;
const adminUpdateRelations = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { referrerUsername } = req.body;
        const user = yield model_1.User.findById(req.params.id).select("-password");
        if (!user)
            return res.status(404).json({ message: "User not found" });
        let newReferrerId = (_b = (_a = user.generationAncestors[0]) === null || _a === void 0 ? void 0 : _a.userId) !== null && _b !== void 0 ? _b : null;
        if (referrerUsername !== undefined) {
            if (referrerUsername === "") {
                newReferrerId = null;
            }
            else {
                const ref = yield model_1.User.findOne({ username: referrerUsername }).select("_id");
                if (!ref)
                    return res.status(400).json({ message: "Referrer not found" });
                newReferrerId = ref._id;
            }
        }
        const generationAncestors = yield buildGenerationAncestors(newReferrerId);
        user.generationAncestors = generationAncestors;
        yield user.save();
        yield Promise.all([
            referrerUsername !== undefined
                ? cascadeGenerationAncestors(user._id)
                : Promise.resolve(),
        ]);
        res.json({ message: "Updated successfully", user });
    }
    catch (err) {
        next(err);
    }
});
exports.adminUpdateRelations = adminUpdateRelations;
const updateInfo = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { nominee, nominee2, district, upazila, dateOfBirth, paymentMethods, } = req.body;
        const user = yield model_1.User.findById(req.user._id);
        if (!user)
            return res.status(404).json({ message: "User not found" });
        if (nominee !== undefined)
            user.nominee = nominee;
        if (nominee2 !== undefined)
            user.nominee2 = nominee2;
        if (district !== undefined)
            user.district = district;
        if (upazila !== undefined)
            user.upazila = upazila;
        if (dateOfBirth !== undefined)
            user.dateOfBirth = dateOfBirth;
        if (paymentMethods !== undefined)
            user.paymentMethods = paymentMethods;
        yield user.save();
        res.json({ message: "Info updated successfully", user });
    }
    catch (err) {
        next(err);
    }
});
exports.updateInfo = updateInfo;
const getLinkedAccounts = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currentUser = req.user;
        const ids = currentUser.linkedPhoneAccounts;
        if (!ids || ids.length === 0) {
            return res.json({ users: [] });
        }
        const users = yield model_1.User.find({ _id: { $in: ids } })
            .select("_id username name image role isActive")
            .lean();
        res.json({ users });
    }
    catch (err) {
        next(err);
    }
});
exports.getLinkedAccounts = getLinkedAccounts;
const updatePermissions = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { permissions } = req.body;
        if (!Array.isArray(permissions) ||
            permissions.some((p) => typeof p !== "string")) {
            return res.status(400).json({
                message: "permissions must be string array",
            });
        }
        const user = yield model_1.User.findById(req.params.id).select("-password");
        if (!user)
            return res.status(404).json({ message: "User not found" });
        // ⚠️ FUTURE: when admin/superadmin permissions diverge, allow editing admin permissions here.
        if (user.role === "superadmin" || user.role === "admin") {
            return res.status(400).json({
                message: "Superadmin/admin permissions are implicit",
            });
        }
        user.permissions = permissions;
        yield user.save();
        res.json({
            message: "Permissions updated",
            user,
        });
    }
    catch (err) {
        next(err);
    }
});
exports.updatePermissions = updatePermissions;
