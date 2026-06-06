"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.Product = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const slugify_1 = __importDefault(require("slugify"));
const titleSchema = {
    en: { type: String, required: true },
    bn: { type: String },
};
const ProductSchema = new mongoose_1.Schema({
    title: titleSchema,
    slug: { type: String, unique: true, required: true },
    img: [{ type: String }],
    regularPrice: { type: Number, default: 0 },
    salePrice: { type: Number, default: 0 },
    deliveryChargeInsideDhaka: { type: Number, default: 0 },
    deliveryChargeOutsideDhaka: { type: Number, default: 0 },
    isAffiliate: { type: Boolean, default: undefined },
    affCommPercent: { type: Number, default: undefined },
    seller: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", default: undefined },
    description: { type: String, default: "" },
    isEnabledByAdmin: { type: Boolean, default: true },
    metaTitle: { type: String, default: "" },
    metaDescription: { type: String, default: "" },
    metaImage: { type: String, default: "" },
    keywords: [{ type: String }],
    type: {
        id: { type: String },
        title: titleSchema,
        slug: { type: String, required: true },
        image: { type: String },
    },
    category: {
        id: { type: String },
        title: titleSchema,
        slug: { type: String, required: true },
        image: { type: String },
    },
    subcategory: {
        id: { type: String },
        title: titleSchema,
        slug: { type: String, required: true },
        image: { type: String },
    },
    brand: {
        type: {
            id: { type: String },
            title: titleSchema,
            slug: { type: String },
            image: { type: String },
        },
        default: undefined,
    },
    productModel: {
        type: {
            id: { type: String },
            title: titleSchema,
            slug: { type: String },
            image: { type: String },
        },
        default: undefined,
    },
    fashionInfo: {
        type: {
            gender: { type: String },
            size: { type: String },
            color: { type: String },
            material: { type: String },
            fit: { type: String },
            pattern: { type: String },
            sleeve: { type: String },
            neckline: { type: String },
            occasion: { type: String },
            season: { type: String },
            careInstructions: { type: String },
            countryOfOrigin: { type: String },
        },
        default: undefined,
    },
    computerAccessoriesInfo: {
        type: {
            processor: { type: String },
            ram: { type: String },
            storage: { type: String },
            graphics: { type: String },
            display: { type: String },
            os: { type: String },
            screenResolution: { type: String },
            refreshRate: { type: String },
            ports: { type: String },
            weight: { type: String },
            batteryLife: { type: String },
            warranty: { type: String },
        },
        default: undefined,
    },
    automobileInfo: {
        type: {
            engineCapacity: { type: String },
            fuelType: { type: String },
            transmission: { type: String },
            mileage: { type: String },
            year: { type: Number },
            condition: { type: String },
            color: { type: String },
            seatingCapacity: { type: Number },
            topSpeed: { type: String },
            torque: { type: String },
            brakeType: { type: String },
            warranty: { type: String },
        },
        default: undefined,
    },
    furnitureInfo: {
        type: {
            material: { type: String },
            dimensions: { type: String },
            weight: { type: String },
            color: { type: String },
            assembly: { type: String },
            style: { type: String },
            finish: { type: String },
            seatingCapacity: { type: Number },
            weightCapacity: { type: String },
            warranty: { type: String },
            careInstructions: { type: String },
        },
        default: undefined,
    },
    booksStationeryInfo: {
        type: {
            author: { type: String },
            publisher: { type: String },
            isbn: { type: String },
            pages: { type: Number },
            language: { type: String },
            edition: { type: String },
            publicationDate: { type: String },
            binding: { type: String },
            dimensions: { type: String },
            weight: { type: String },
            genre: { type: String },
        },
        default: undefined,
    },
    electronicsInfo: {
        type: {
            screenSize: { type: String },
            battery: { type: String },
            camera: { type: String },
            storage: { type: String },
            ram: { type: String },
            connectivity: { type: String },
            processor: { type: String },
            os: { type: String },
            simType: { type: String },
            networkType: { type: String },
            weight: { type: String },
            warranty: { type: String },
        },
        default: undefined,
    },
    homeAppliancesInfo: {
        type: {
            capacity: { type: String },
            powerConsumption: { type: String },
            voltage: { type: String },
            warranty: { type: String },
            energyRating: { type: String },
            dimensions: { type: String },
            weight: { type: String },
            color: { type: String },
            material: { type: String },
            features: { type: String },
            noiseLevel: { type: String },
        },
        default: undefined,
    },
    sportsFitnessInfo: {
        type: {
            weight: { type: String },
            dimensions: { type: String },
            maxLoad: { type: String },
            material: { type: String },
            features: { type: String },
            color: { type: String },
            adjustable: { type: Boolean },
            foldable: { type: Boolean },
            warranty: { type: String },
            targetArea: { type: String },
            difficulty: { type: String },
        },
        default: undefined,
    },
    beautyPersonalCareInfo: {
        type: {
            skinType: { type: String },
            volume: { type: String },
            ingredients: { type: String },
            scent: { type: String },
            expiry: { type: String },
            brand: { type: String },
            usage: { type: String },
            benefits: { type: String },
            suitableFor: { type: String },
            certifications: { type: String },
            countryOfOrigin: { type: String },
        },
        default: undefined,
    },
    toysGamesInfo: {
        type: {
            ageRange: { type: String },
            material: { type: String },
            dimensions: { type: String },
            batteryRequired: { type: Boolean },
            safetyStandard: { type: String },
            weight: { type: String },
            color: { type: String },
            numberOfPlayers: { type: String },
            skillDevelopment: { type: String },
            warranty: { type: String },
        },
        default: undefined,
    },
    jewelryWatchesInfo: {
        type: {
            material: { type: String },
            dialSize: { type: String },
            strapMaterial: { type: String },
            waterResistance: { type: String },
            warranty: { type: String },
            movement: { type: String },
            displayType: { type: String },
            features: { type: String },
            weight: { type: String },
            color: { type: String },
            gender: { type: String },
        },
        default: undefined,
    },
    foodBeveragesInfo: {
        type: {
            weight: { type: String },
            ingredients: { type: String },
            nutritionInfo: { type: String },
            expiryDate: { type: String },
            storage: { type: String },
            flavor: { type: String },
            brand: { type: String },
            countryOfOrigin: { type: String },
            servingSize: { type: String },
            allergenInfo: { type: String },
            certifications: { type: String },
        },
        default: undefined,
    },
    healthWellnessInfo: {
        type: {
            dosage: { type: String },
            ingredients: { type: String },
            usage: { type: String },
            sideEffects: { type: String },
            expiryDate: { type: String },
            form: { type: String },
            quantity: { type: String },
            benefits: { type: String },
            warnings: { type: String },
            storage: { type: String },
            certifications: { type: String },
        },
        default: undefined,
    },
    petSuppliesInfo: {
        type: {
            petType: { type: String },
            weight: { type: String },
            ingredients: { type: String },
            ageGroup: { type: String },
            expiryDate: { type: String },
            flavor: { type: String },
            brand: { type: String },
            nutritionInfo: { type: String },
            feedingGuidelines: { type: String },
            storage: { type: String },
            certifications: { type: String },
        },
        default: undefined,
    },
    musicalInstrumentsInfo: {
        type: {
            instrumentType: { type: String },
            material: { type: String },
            strings: { type: Number },
            finish: { type: String },
            accessories: { type: String },
            color: { type: String },
            weight: { type: String },
            dimensions: { type: String },
            skillLevel: { type: String },
            warranty: { type: String },
            countryOfOrigin: { type: String },
        },
        default: undefined,
    },
    homeLivingInfo: { type: { material: String, dimensions: String, color: String, weight: String, style: String, roomType: String, assembly: String, careInstructions: String, warranty: String }, default: undefined },
    mobileTabletsInfo: { type: { screenSize: String, battery: String, camera: String, storage: String, ram: String, processor: String, os: String, simType: String, networkType: String, color: String, weight: String, warranty: String }, default: undefined },
    officeSuppliesInfo: { type: { material: String, dimensions: String, color: String, weight: String, quantity: String, compatibility: String, warranty: String }, default: undefined },
    gardenOutdoorInfo: { type: { material: String, dimensions: String, color: String, weight: String, weatherResistant: Boolean, assembly: String, warranty: String }, default: undefined },
    babyProductsInfo: { type: { ageRange: String, material: String, dimensions: String, color: String, weight: String, safetyStandard: String, washable: Boolean, warranty: String }, default: undefined },
    toolsHardwareInfo: { type: { material: String, dimensions: String, weight: String, powerSource: String, voltage: String, warranty: String, compatibility: String }, default: undefined },
    giftOccasionsInfo: { type: { occasion: String, material: String, dimensions: String, color: String, weight: String, customizable: Boolean, packaging: String }, default: undefined },
    cleaningHouseholdInfo: { type: { volume: String, ingredients: String, scent: String, usage: String, surfaceType: String, certifications: String, expiryDate: String }, default: undefined },
    industrialScientificInfo: { type: { material: String, dimensions: String, weight: String, voltage: String, powerConsumption: String, certifications: String, warranty: String }, default: undefined },
    artCraftInfo: { type: { material: String, dimensions: String, color: String, weight: String, quantity: String, skillLevel: String, ageRange: String }, default: undefined },
    travelLuggageInfo: { type: { material: String, dimensions: String, weight: String, color: String, capacity: String, lockType: String, warranty: String }, default: undefined },
    medicinesHealthcareInfo: { type: { dosage: String, ingredients: String, usage: String, sideEffects: String, expiryDate: String, form: String, quantity: String, warnings: String, storage: String, prescriptionRequired: Boolean, certifications: String }, default: undefined },
}, { timestamps: true });
ProductSchema.index({ "title.en": "text" });
// Generate unique slug before save
ProductSchema.pre("save", function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        if (this.isNew || this.isModified("title.en")) {
            const baseSlug = (0, slugify_1.default)(this.title.en, { lower: true, strict: true });
            let slug = baseSlug;
            let counter = 1;
            while (yield mongoose_1.default.models.Product.findOne({ slug, _id: { $ne: this._id } })) {
                slug = `${baseSlug}-${counter}`;
                counter++;
            }
            this.slug = slug;
        }
        next();
    });
});
exports.Product = mongoose_1.default.models.Product || (0, mongoose_1.model)("Product", ProductSchema);
