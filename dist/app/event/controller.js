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
exports.deleteNotification = exports.createNotification = exports.getNotifications = exports.deleteEvent = exports.updateEvent = exports.createEvent = exports.getAllEvents = exports.getEvents = void 0;
const model_1 = require("./model");
// Events
const getEvents = (_req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const events = yield model_1.Event.find({ isActive: true }).sort({ createdAt: -1 }).lean();
        res.json({ events });
    }
    catch (err) {
        next(err);
    }
});
exports.getEvents = getEvents;
const getAllEvents = (_req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const events = yield model_1.Event.find().sort({ createdAt: -1 }).lean();
        res.json({ events });
    }
    catch (err) {
        next(err);
    }
});
exports.getAllEvents = getAllEvents;
const createEvent = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const event = yield model_1.Event.create(req.body);
        res.status(201).json({ message: "Event created", event });
    }
    catch (err) {
        next(err);
    }
});
exports.createEvent = createEvent;
const updateEvent = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const event = yield model_1.Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!event)
            return res.status(404).json({ message: "Event not found" });
        res.json({ message: "Event updated", event });
    }
    catch (err) {
        next(err);
    }
});
exports.updateEvent = updateEvent;
const deleteEvent = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield model_1.Event.findByIdAndDelete(req.params.id);
        res.json({ message: "Event deleted" });
    }
    catch (err) {
        next(err);
    }
});
exports.deleteEvent = deleteEvent;
// Notifications
const getNotifications = (_req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const notifications = yield model_1.Notification.find().sort({ createdAt: -1 }).limit(20).lean();
        res.json({ notifications });
    }
    catch (err) {
        next(err);
    }
});
exports.getNotifications = getNotifications;
const createNotification = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const notification = yield model_1.Notification.create(Object.assign(Object.assign({}, req.body), { createdBy: req.user._id }));
        res.status(201).json({ message: "Notification sent", notification });
    }
    catch (err) {
        next(err);
    }
});
exports.createNotification = createNotification;
const deleteNotification = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield model_1.Notification.findByIdAndDelete(req.params.id);
        res.json({ message: "Notification deleted" });
    }
    catch (err) {
        next(err);
    }
});
exports.deleteNotification = deleteNotification;
