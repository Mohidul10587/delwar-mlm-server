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
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBranch = exports.updateBranch = exports.createBranch = exports.getAllBranches = exports.getBranches = void 0;
const model_1 = require("./model");
const model_2 = require("../user/model");
/** GET /branch — public list of active branches */
const getBranches = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const branches = yield model_1.Branch.find({ isActive: true })
            .populate("managerId", "name username phone")
            .sort({ name: 1 })
            .lean();
        res.json({ branches });
    }
    catch (err) {
        next(err);
    }
});
exports.getBranches = getBranches;
/** GET /branch/all — superadmin: all branches (active + inactive) */
const getAllBranches = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const branches = yield model_1.Branch.find()
            .populate("managerId", "name username phone")
            .sort({ createdAt: -1 })
            .lean();
        res.json({ branches });
    }
    catch (err) {
        next(err);
    }
});
exports.getAllBranches = getAllBranches;
/** POST /branch — superadmin creates a branch */
const createBranch = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { name, address, managerUsername } = req.body;
        if (!name || !managerUsername)
            return res
                .status(400)
                .json({ message: "Branch name and manager username are required" });
        // Find the manager by username
        const manager = yield model_2.User.findOne({ username: managerUsername });
        if (!manager)
            return res.status(404).json({ message: "Manager user not found" });
        // Promote user to branch_manager role if not already
        if (manager.role !== "branch_manager") {
            manager.role = "branch_manager";
            yield manager.save();
        }
        const branch = yield model_1.Branch.create({
            name: name.trim(),
            address: (_a = address === null || address === void 0 ? void 0 : address.trim()) !== null && _a !== void 0 ? _a : "",
            managerId: manager._id,
        });
        const populated = yield model_1.Branch.findById(branch._id)
            .populate("managerId", "name username phone")
            .lean();
        res.status(201).json({ message: "Branch created", branch: populated });
    }
    catch (err) {
        if (err.code === 11000)
            return res.status(400).json({ message: "Branch name already exists" });
        next(err);
    }
});
exports.createBranch = createBranch;
/** PUT /branch/:id — superadmin updates a branch */
const updateBranch = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, address, managerUsername, isActive } = req.body;
        const branch = yield model_1.Branch.findById(req.params.id);
        if (!branch)
            return res.status(404).json({ message: "Branch not found" });
        if (name)
            branch.name = name.trim();
        if (address !== undefined)
            branch.address = address.trim();
        if (typeof isActive === "boolean")
            branch.isActive = isActive;
        if (managerUsername) {
            // Demote old manager back to user (if not superadmin/admin)
            const oldManager = yield model_2.User.findById(branch.managerId);
            if (oldManager &&
                oldManager.role === "branch_manager" &&
                oldManager.username !== managerUsername) {
                // Check if this manager manages another branch; if not, demote
                const otherBranch = yield model_1.Branch.findOne({
                    managerId: oldManager._id,
                    _id: { $ne: branch._id },
                });
                if (!otherBranch) {
                    oldManager.role = "user";
                    yield oldManager.save();
                }
            }
            const newManager = yield model_2.User.findOne({ username: managerUsername });
            if (!newManager)
                return res.status(404).json({ message: "New manager user not found" });
            if (newManager.role !== "branch_manager") {
                newManager.role = "branch_manager";
                yield newManager.save();
            }
            branch.managerId = newManager._id;
        }
        yield branch.save();
        const populated = yield model_1.Branch.findById(branch._id)
            .populate("managerId", "name username phone")
            .lean();
        res.json({ message: "Branch updated", branch: populated });
    }
    catch (err) {
        next(err);
    }
});
exports.updateBranch = updateBranch;
/** DELETE /branch/:id — superadmin deletes a branch */
const deleteBranch = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const branch = yield model_1.Branch.findByIdAndDelete(req.params.id);
        if (!branch)
            return res.status(404).json({ message: "Branch not found" });
        // Demote manager if they only managed this branch
        const otherBranch = yield model_1.Branch.findOne({ managerId: branch.managerId });
        if (!otherBranch) {
            yield model_2.User.findByIdAndUpdate(branch.managerId, { role: "user" });
        }
        res.json({ message: "Branch deleted" });
    }
    catch (err) {
        next(err);
    }
});
exports.deleteBranch = deleteBranch;
