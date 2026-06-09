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
exports.deleteNotice = exports.getNotices = exports.createNotice = exports.setSocketIO = void 0;
const model_1 = require("./model");
let io;
const setSocketIO = (socketIO) => { io = socketIO; };
exports.setSocketIO = setSocketIO;
const createNotice = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, message } = req.body;
        const notice = yield model_1.Notice.create({ title, message, createdBy: req.user._id });
        const populated = yield notice.populate("createdBy", "name");
        io === null || io === void 0 ? void 0 : io.emit("new_notice", populated);
        res.status(201).json(populated);
    }
    catch (err) {
        next(err);
    }
});
exports.createNotice = createNotice;
const getNotices = (_req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const notices = yield model_1.Notice.find().populate("createdBy", "name").sort({ createdAt: -1 }).limit(50);
        res.json(notices);
    }
    catch (err) {
        next(err);
    }
});
exports.getNotices = getNotices;
const deleteNotice = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield model_1.Notice.findByIdAndDelete(req.params.id);
        io === null || io === void 0 ? void 0 : io.emit("delete_notice", req.params.id);
        res.json({ message: "Deleted" });
    }
    catch (err) {
        next(err);
    }
});
exports.deleteNotice = deleteNotice;
