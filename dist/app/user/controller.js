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
exports.updatePermissions = exports.adminUpdateRelations = exports.deleteUser = exports.getUsers = exports.adminUpdatePassword = exports.adminUpdatePhone = exports.toggleUserActive = exports.changePassword = exports.updatePhone = exports.updateImage = exports.switchAccount = exports.verify = exports.logout = exports.refresh = exports.login = exports.adminRegister = exports.register = void 0;
const model_1 = require("./model");
const model_2 = require("../wallet/model");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const validation_1 = require("./validation");
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "your-refresh-secret";
const defaultPermissionsByRole = {
    admin: ["purchase.review"],
    staff: ["purchase.review"],
};
const generateTokens = (id) => {
    const accessToken = jsonwebtoken_1.default.sign({ id }, JWT_SECRET, { expiresIn: "30m" });
    const refreshToken = jsonwebtoken_1.default.sign({ id }, JWT_REFRESH_SECRET, { expiresIn: "1d" });
    return { accessToken, refreshToken };
};
const cookieOpts = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax"),
});
/** Build generation ancestor list (no side needed). */
function buildGenerationAncestors(referrerId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (!referrerId)
            return [];
        const parent = yield model_1.User.findById(referrerId).select("generationAncestors").lean();
        if (!parent)
            return [];
        const parentAncestors = ((_a = parent.generationAncestors) !== null && _a !== void 0 ? _a : []).map((a) => ({ level: a.level + 1, userId: a.userId }));
        return [{ level: 1, userId: referrerId }, ...parentAncestors];
    });
}
/** Build placement ancestor list — each entry carries the side this subtree is on relative to that ancestor. */
function buildPlacementAncestors(placementParentId, placementSide) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (!placementParentId || !placementSide)
            return [];
        const parent = yield model_1.User.findById(placementParentId).select("placementAncestors").lean();
        if (!parent)
            return [];
        // level-1 entry: direct parent, side = placementSide of the new user
        // higher levels: inherit the side from the parent's own level-1 entry (which side the parent is on relative to grandparent)
        const parentAncestors = ((_a = parent.placementAncestors) !== null && _a !== void 0 ? _a : []).map((a) => ({
            level: a.level + 1,
            userId: a.userId,
            side: a.side,
        }));
        return [{ level: 1, userId: placementParentId, side: placementSide }, ...parentAncestors];
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
            const children = yield model_1.User.find({ "generationAncestors.0.userId": { $in: queue } })
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
/**
 * Cascade placement ancestor updates to all placement descendants (BFS).
 * Finds children by placementAncestors[0].userId === rootId.
 */
function cascadePlacementAncestors(rootId) {
    return __awaiter(this, void 0, void 0, function* () {
        let queue = [rootId];
        while (queue.length > 0) {
            const children = yield model_1.User.find({ "placementAncestors.0.userId": { $in: queue } })
                .select("_id placementAncestors")
                .lean();
            if (children.length === 0)
                break;
            yield Promise.all(children.map((child) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                const level1 = (_a = child.placementAncestors) === null || _a === void 0 ? void 0 : _a[0];
                const parentId = level1 === null || level1 === void 0 ? void 0 : level1.userId;
                const side = level1 === null || level1 === void 0 ? void 0 : level1.side;
                const newAncestors = yield buildPlacementAncestors(parentId, side);
                return model_1.User.updateOne({ _id: child._id }, { $set: { placementAncestors: newAncestors } });
            })));
            queue = children.map((c) => c._id);
        }
    });
}
const register = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, username, phone, password, referrerUsername, placementParentUsername, placementSide } = validation_1.registerSchema.parse(req.body);
        const existingUsername = yield model_1.User.findOne({ username });
        if (existingUsername)
            return res.status(400).json({ message: { en: "Username already taken", bn: "ইউজারনেম ইতিমধ্যে ব্যবহৃত" } });
        let referrerId = null;
        if (referrerUsername) {
            const referrer = yield model_1.User.findOne({ username: referrerUsername }).select("_id");
            if (!referrer)
                return res.status(400).json({ message: { en: "Referrer not found", bn: "রেফারার পাওয়া যায়নি" } });
            referrerId = referrer._id;
        }
        let placementParentId = null;
        if (placementParentUsername || placementSide) {
            if (!placementParentUsername || !placementSide)
                return res.status(400).json({ message: { en: "Both placementParentUsername and placementSide are required", bn: "placementParentUsername এবং placementSide উভয়ই প্রয়োজন" } });
            const parent = yield model_1.User.findOne({ username: placementParentUsername }).select("_id");
            if (!parent)
                return res.status(400).json({ message: { en: "Placement parent not found", bn: "প্লেসমেন্ট প্যারেন্ট পাওয়া যায়নি" } });
            placementParentId = parent._id;
            const sideOccupied = yield model_1.User.findOne({ "placementAncestors.0.userId": placementParentId, "placementAncestors.0.side": placementSide });
            if (sideOccupied)
                return res.status(400).json({ message: { en: `Side ${placementSide} is already occupied`, bn: `${placementSide} সাইডে ইতিমধ্যে একজন আছেন` } });
        }
        const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
        const [generationAncestors, placementAncestors] = yield Promise.all([
            buildGenerationAncestors(referrerId),
            buildPlacementAncestors(placementParentId, placementSide !== null && placementSide !== void 0 ? placementSide : null),
        ]);
        const user = yield model_1.User.create({
            name, username, phone, password: hashedPassword,
            generationAncestors, placementAncestors,
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
        res.cookie("accessToken", accessToken, cookieOpts());
        res.cookie("refreshToken", refreshToken, cookieOpts());
        res.status(201).json({ message: { en: "Registered successfully", bn: "সফলভাবে নিবন্ধিত" }, user });
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
        res.status(400).json({ message: { en: `${label} not found`, bn: `${label} পাওয়া যায়নি` } });
        return { id: null, error: true };
    }
    return { id: found._id, error: false };
});
const adminRegister = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { name, username, phone, password, referrerUsername, placementParentUsername, placementSide, role } = validation_1.adminRegisterSchema.parse(req.body);
        const existingUsername = yield model_1.User.findOne({ username });
        if (existingUsername)
            return res.status(400).json({ message: { en: "Username already taken", bn: "ইউজারনেম ইতিমধ্যে ব্যবহৃত" } });
        const { id: referrerId, error: refErr } = yield resolveUsername(referrerUsername, "Referrer", res);
        if (refErr)
            return;
        if ((placementParentUsername && !placementSide) || (!placementParentUsername && placementSide))
            return res.status(400).json({ message: { en: "Both placementParentUsername and placementSide are required", bn: "placementParentUsername এবং placementSide উভয়ই প্রয়োজন" } });
        const { id: placementParentId, error: plErr } = yield resolveUsername(placementParentUsername, "Placement parent", res);
        if (plErr)
            return;
        if (placementParentId && placementSide) {
            const sideOccupied = yield model_1.User.findOne({ "placementAncestors.0.userId": placementParentId, "placementAncestors.0.side": placementSide });
            if (sideOccupied)
                return res.status(400).json({ message: { en: `Side ${placementSide} is already occupied`, bn: `${placementSide} সাইডে ইতিমধ্যে একজন আছেন` } });
        }
        const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
        const [generationAncestors, placementAncestors] = yield Promise.all([
            buildGenerationAncestors(referrerId),
            buildPlacementAncestors(placementParentId, placementSide !== null && placementSide !== void 0 ? placementSide : null),
        ]);
        const user = yield model_1.User.create({
            name, username, phone,
            password: hashedPassword,
            role,
            permissions: (_a = defaultPermissionsByRole[role]) !== null && _a !== void 0 ? _a : [],
            generationAncestors,
            placementAncestors,
        });
        yield model_2.Wallet.create({ userId: user._id });
        const siblings = yield model_1.User.find({ phone, _id: { $ne: user._id } }).select("_id");
        if (siblings.length > 0) {
            const siblingIds = siblings.map((s) => s._id);
            yield model_1.User.updateMany({ _id: { $in: siblingIds } }, { $addToSet: { linkedPhoneAccounts: user._id } });
            user.linkedPhoneAccounts = siblingIds;
            yield user.save();
        }
        res.status(201).json({ message: { en: "User registered successfully", bn: "ব্যবহারকারী সফলভাবে নিবন্ধিত" }, user });
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
            return res.status(404).json({ message: { en: "User not found", bn: "ইউজার পাওয়া যায়নি" } });
        if (!user.isActive)
            return res.status(403).json({ message: { en: "Account is inactive", bn: "অ্যাকাউন্ট নিষ্ক্রিয়" } });
        const isValid = yield bcryptjs_1.default.compare(password, user.password);
        if (!isValid)
            return res.status(401).json({ message: { en: "Invalid password", bn: "ভুল পাসওয়ার্ড" } });
        const { accessToken, refreshToken } = generateTokens(user._id.toString());
        res.cookie("accessToken", accessToken, cookieOpts());
        res.cookie("refreshToken", refreshToken, cookieOpts());
        res.json({ message: { en: "Login successful", bn: "লগইন সফল" }, user });
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
        const decoded = jsonwebtoken_1.default.verify(token, JWT_REFRESH_SECRET);
        const user = yield model_1.User.findById(decoded.id).select("-password");
        if (!user)
            return res.status(401).json({ message: "Invalid refresh token" });
        const newAccessToken = jsonwebtoken_1.default.sign({ id: user._id.toString() }, JWT_SECRET, { expiresIn: "30m" });
        res.cookie("accessToken", newAccessToken, cookieOpts());
        res.json({ success: true, user });
    }
    catch (_a) {
        res.status(401).json({ message: "Refresh failed" });
    }
});
exports.refresh = refresh;
const logout = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");
        res.json({ message: { en: "Logged out successfully", bn: "সফলভাবে লগআউট হয়েছে" } });
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
            return res.status(401).json({ message: { en: "No token provided", bn: "টোকেন প্রদান করা হয়নি" } });
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const user = yield model_1.User.findById(decoded.id).select("-password");
        if (!user)
            return res.status(404).json({ message: { en: "User not found", bn: "ইউজার পাওয়া যায়নি" } });
        res.json({ user });
    }
    catch (_a) {
        res.status(401).json({ message: { en: "Invalid token", bn: "অবৈধ টোকেন" } });
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
            return res.status(403).json({ message: { en: "Account not linked", bn: "অ্যাকাউন্ট লিংকড নয়" } });
        const targetUser = yield model_1.User.findById(targetUserId).select("-password");
        if (!targetUser)
            return res.status(404).json({ message: { en: "Target account not found", bn: "টার্গেট অ্যাকাউন্ট পাওয়া যায়নি" } });
        if (!targetUser.isActive)
            return res.status(403).json({ message: { en: "Target account is inactive", bn: "টার্গেট অ্যাকাউন্ট নিষ্ক্রিয়" } });
        const { accessToken, refreshToken } = generateTokens(targetUser._id.toString());
        res.cookie("accessToken", accessToken, cookieOpts());
        res.cookie("refreshToken", refreshToken, cookieOpts());
        res.json({ message: { en: "Switched account", bn: "অ্যাকাউন্ট সুইচ হয়েছে" }, user: targetUser });
    }
    catch (err) {
        next(err);
    }
});
exports.switchAccount = switchAccount;
const updateImage = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { image } = req.body;
        if (!image)
            return res.status(400).json({ message: { en: "Image URL required", bn: "ছবির URL প্রয়োজন" } });
        const user = yield model_1.User.findByIdAndUpdate((_a = req.user) === null || _a === void 0 ? void 0 : _a._id, { $set: { image } }, { new: true }).select("-password");
        if (!user)
            return res.status(404).json({ message: { en: "User not found", bn: "ইউজার পাওয়া যায়নি" } });
        res.json({ message: { en: "Image updated", bn: "ছবি আপডেট হয়েছে" }, user });
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
        const user = yield model_1.User.findByIdAndUpdate((_a = req.user) === null || _a === void 0 ? void 0 : _a._id, { $set: { phone } }, { new: true }).select("-password");
        if (!user)
            return res.status(404).json({ message: { en: "User not found", bn: "ইউজার পাওয়া যায়নি" } });
        res.json({ message: { en: "Phone updated", bn: "ফোন আপডেট হয়েছে" }, user });
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
            return res.status(404).json({ message: { en: "User not found", bn: "ইউজার পাওয়া যায়নি" } });
        const isValid = yield bcryptjs_1.default.compare(currentPassword, user.password);
        if (!isValid)
            return res.status(401).json({ message: { en: "Current password is incorrect", bn: "বর্তমান পাসওয়ার্ড ভুল" } });
        user.password = yield bcryptjs_1.default.hash(newPassword, 10);
        yield user.save();
        res.json({ message: { en: "Password changed", bn: "পাসওয়ার্ড পরিবর্তিত হয়েছে" } });
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
            return res.status(404).json({ message: { en: "User not found", bn: "ইউজার পাওয়া যায়নি" } });
        user.isActive = !user.isActive;
        yield user.save();
        res.json({
            message: user.isActive
                ? { en: "User activated", bn: "ব্যবহারকারী সক্রিয় করা হয়েছে" }
                : { en: "User disabled", bn: "ব্যবহারকারী নিষ্ক্রিয় করা হয়েছে" },
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
            return res.status(404).json({ message: { en: "User not found", bn: "ইউজার পাওয়া যায়নি" } });
        res.json({ message: { en: "Phone updated", bn: "ফোন আপডেট হয়েছে" }, user });
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
            return res.status(400).json({ message: { en: "Password required", bn: "পাসওয়ার্ড প্রয়োজন" } });
        const hashed = yield bcryptjs_1.default.hash(password, 10);
        const user = yield model_1.User.findByIdAndUpdate(req.params.id, { $set: { password: hashed } }, { new: true }).select("-password");
        if (!user)
            return res.status(404).json({ message: { en: "User not found", bn: "ইউজার পাওয়া যায়নি" } });
        res.json({ message: { en: "Password updated", bn: "পাসওয়ার্ড আপডেট হয়েছে" } });
    }
    catch (err) {
        next(err);
    }
});
exports.adminUpdatePassword = adminUpdatePassword;
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
            model_1.User.find(query).select("-password").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
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
            return res.status(404).json({ message: { en: "User not found", bn: "ইউজার পাওয়া যায়নি" } });
        if (user.role === "superadmin")
            return res.status(403).json({ message: { en: "Cannot delete superadmin", bn: "সুপারএডমিন ডিলিট করা যাবে না" } });
        yield model_1.User.findByIdAndDelete(req.params.id);
        res.json({ message: { en: "User deleted", bn: "ব্যবহারকারী মুছে ফেলা হয়েছে" } });
    }
    catch (err) {
        next(err);
    }
});
exports.deleteUser = deleteUser;
const adminUpdateRelations = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    try {
        const { referrerUsername, placementParentUsername, placementSide } = req.body;
        const user = yield model_1.User.findById(req.params.id).select("-password");
        if (!user)
            return res.status(404).json({ message: { en: "User not found", bn: "ইউজার পাওয়া যায়নি" } });
        let newReferrerId = (_b = (_a = user.generationAncestors[0]) === null || _a === void 0 ? void 0 : _a.userId) !== null && _b !== void 0 ? _b : null;
        let newPlacementParentId = (_d = (_c = user.placementAncestors[0]) === null || _c === void 0 ? void 0 : _c.userId) !== null && _d !== void 0 ? _d : null;
        let newPlacementSide = (_f = (_e = user.placementAncestors[0]) === null || _e === void 0 ? void 0 : _e.side) !== null && _f !== void 0 ? _f : null;
        if (referrerUsername !== undefined) {
            if (referrerUsername === "") {
                newReferrerId = null;
            }
            else {
                const ref = yield model_1.User.findOne({ username: referrerUsername }).select("_id");
                if (!ref)
                    return res.status(400).json({ message: { en: "Referrer not found", bn: "রেফারার পাওয়া যায়নি" } });
                newReferrerId = ref._id;
            }
        }
        if (placementParentUsername !== undefined) {
            if (placementParentUsername === "") {
                newPlacementParentId = null;
                newPlacementSide = null;
            }
            else {
                if (!placementSide)
                    return res.status(400).json({ message: { en: "placementSide required", bn: "placementSide প্রয়োজন" } });
                const parent = yield model_1.User.findOne({ username: placementParentUsername }).select("_id");
                if (!parent)
                    return res.status(400).json({ message: { en: "Placement parent not found", bn: "প্লেসমেন্ট প্যারেন্ট পাওয়া যায়নি" } });
                const sideOccupied = yield model_1.User.findOne({ "placementAncestors.0.userId": parent._id, "placementAncestors.0.side": placementSide, _id: { $ne: req.params.id } });
                if (sideOccupied)
                    return res.status(400).json({ message: { en: `Side ${placementSide} is already occupied`, bn: `${placementSide} সাইডে ইতিমধ্যে একজন আছেন` } });
                newPlacementParentId = parent._id;
                newPlacementSide = placementSide;
            }
        }
        const [generationAncestors, placementAncestors] = yield Promise.all([
            buildGenerationAncestors(newReferrerId),
            buildPlacementAncestors(newPlacementParentId, newPlacementSide),
        ]);
        user.generationAncestors = generationAncestors;
        user.placementAncestors = placementAncestors;
        yield user.save();
        yield Promise.all([
            referrerUsername !== undefined ? cascadeGenerationAncestors(user._id) : Promise.resolve(),
            placementParentUsername !== undefined ? cascadePlacementAncestors(user._id) : Promise.resolve(),
        ]);
        res.json({ message: { en: "Updated successfully", bn: "সফলভাবে আপডেট হয়েছে" }, user });
    }
    catch (err) {
        next(err);
    }
});
exports.adminUpdateRelations = adminUpdateRelations;
const updatePermissions = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { permissions } = req.body;
        if (!Array.isArray(permissions) || permissions.some((p) => typeof p !== "string")) {
            return res.status(400).json({
                message: { en: "permissions must be string array", bn: "permissions স্ট্রিং অ্যারে হতে হবে" },
            });
        }
        const user = yield model_1.User.findById(req.params.id).select("-password");
        if (!user)
            return res.status(404).json({ message: { en: "User not found", bn: "ইউজার পাওয়া যায়নি" } });
        if (user.role === "superadmin") {
            return res.status(400).json({
                message: { en: "Superadmin permissions are implicit", bn: "সুপারএডমিন পারমিশন আলাদা সেট করা যায় না" },
            });
        }
        user.permissions = permissions;
        yield user.save();
        res.json({
            message: { en: "Permissions updated", bn: "পারমিশন আপডেট হয়েছে" },
            user,
        });
    }
    catch (err) {
        next(err);
    }
});
exports.updatePermissions = updatePermissions;
