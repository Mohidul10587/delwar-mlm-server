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
exports.seedSettings = void 0;
const model_1 = require("../app/settings/model");
const seedSettings = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const settingsExists = yield model_1.Settings.findOne();
        if (!settingsExists) {
            yield model_1.Settings.create({
                siteName: "My App",
                logo: "",
                metaTitle: "My App - Welcome",
                metaDescription: "Welcome to My App",
                metaKeywords: "app, website, platform",
                defaultTheme: "light",
            });
            console.log("✅ Default settings created successfully");
        }
        else {
            console.log("✅ Settings already exist");
        }
    }
    catch (error) {
        console.error("❌ Error seeding settings:", error);
    }
});
exports.seedSettings = seedSettings;
