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
exports.migrateToReferralChainSystem = void 0;
const model_1 = require("../app/user/model");
const model_2 = require("../app/referralChain/model");
/**
 * Migration script to convert referredBy relationships to referral chain
 * Run this once to migrate existing data
 */
const migrateToReferralChainSystem = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("Starting migration to referral chain system...");
        // Get all users with referredBy field (if it still exists in DB)
        const users = yield model_1.User.find().lean();
        for (const user of users) {
            // Check if referral chain already exists
            const existingChain = yield model_2.ReferralChain.findOne({ userId: user._id });
            if (existingChain) {
                console.log(`Referral chain already exists for user ${user.userId}`);
                continue;
            }
            // If user has referredBy, build referral chain
            const referredBy = user.referredBy;
            if (referredBy) {
                const chain = { userId: user._id, level1: referredBy };
                // Find referrer's chain to build complete hierarchy
                const referrerChain = yield model_2.ReferralChain.findOne({
                    userId: referredBy,
                });
                if (referrerChain) {
                    if (referrerChain.level1)
                        chain.level2 = referrerChain.level1;
                    if (referrerChain.level2)
                        chain.level3 = referrerChain.level2;
                    if (referrerChain.level3)
                        chain.level4 = referrerChain.level3;
                    if (referrerChain.level4)
                        chain.level5 = referrerChain.level4;
                    if (referrerChain.level5)
                        chain.level6 = referrerChain.level5;
                }
                yield model_2.ReferralChain.create(chain);
                console.log(`Created referral chain for user ${user.userId}`);
            }
            else {
                // User has no referrer, create empty chain record
                yield model_2.ReferralChain.create({ userId: user._id });
                console.log(`Created empty referral chain for user ${user.userId}`);
            }
        }
        console.log("Migration completed successfully!");
    }
    catch (error) {
        console.error("Migration failed:", error);
        throw error;
    }
});
exports.migrateToReferralChainSystem = migrateToReferralChainSystem;
