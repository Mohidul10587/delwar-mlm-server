"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PageElements = void 0;
const mongoose_1 = require("mongoose");
const isObjectId_1 = require("../shared/isObjectId");
const sectionSchema = new mongoose_1.Schema({
    sectionTitle: { type: String, required: true },
    link: { type: String, default: "" },
    status: { type: Boolean, required: true },
    titleLink: { type: String, default: "" },
    titleAlignment: {
        type: String,
        enum: ["left", "center", "right"],
        default: "left",
    },
    isTitle: { type: String, default: "true" },
    desktopGrid: { type: Number, default: 4 },
    mobileGrid: { type: Number, default: 1 },
    margin: { type: Number, default: 0 },
    padding: { type: Number, default: 0 },
    boxText: { type: String, default: "#ffffff" },
    titleTextColor: { type: String, default: "#ffffff" },
    boxBg: { type: String, default: "#ffffff" },
    titleBgColor: { type: String, default: "#ffffff" },
    gridStyle: { type: String, default: "1" },
    productStyle: { type: String, default: "1" },
    postLimit: { type: Number, default: 10 },
    display: {
        type: String,
        enum: ["both", "desktop", "mobile"],
        default: "both",
    },
    imagePosition: {
        type: String,
        enum: ["left", "right", "center"],
        default: "left",
    },
    position: { type: Number, required: true },
    selectionType: { type: String, required: true },
    banner: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Banner",
        set: (v) => ((0, isObjectId_1.isObjectId)(v) ? v : null),
        default: null,
    },
    category: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Category",
        set: (v) => ((0, isObjectId_1.isObjectId)(v) ? v : null),
        default: null,
    },
    subcategory: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Subcategory",
        set: (v) => ((0, isObjectId_1.isObjectId)(v) ? v : null),
        default: null,
    },
    suggestion: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Suggestion",
        set: (v) => ((0, isObjectId_1.isObjectId)(v) ? v : null),
        default: null,
    },
    writer: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Writer",
        set: (v) => ((0, isObjectId_1.isObjectId)(v) ? v : null),
        default: null,
    },
    latest: { type: [], default: [] },
    preOrder: { type: [], default: [] },
    images: { type: [String], default: [] },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
}, { _id: false });
const pageElementsSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    sections: { type: [sectionSchema], default: [] },
}, { timestamps: true });
exports.PageElements = (0, mongoose_1.model)("Elements", pageElementsSchema);
