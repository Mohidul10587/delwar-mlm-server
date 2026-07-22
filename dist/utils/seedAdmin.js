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
exports.seedAdmin = void 0;
const model_1 = require("../app/user/model");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const seedAdmin = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const adminExists = yield model_1.User.findOne({ role: "superadmin" });
        if (!adminExists) {
            const hashedPassword = yield bcryptjs_1.default.hash("super-admin", 10);
            const admin = yield model_1.User.create({
                name: "Super Admin",
                phone: "01700000000",
                username: "super-admin",
                password: hashedPassword,
                role: "superadmin",
                isActive: true,
                isPhoneVerified: true,
                permissions: [],
            });
            console.log(`✅ Super Admin created — username: ${admin.username}, password: 01700000000`);
        }
    }
    catch (error) {
        console.error("❌ Error seeding admin:", error);
    }
});
exports.seedAdmin = seedAdmin;
