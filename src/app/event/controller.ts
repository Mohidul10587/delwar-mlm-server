import { Request, Response, NextFunction } from "express";
import { Event, Notification } from "./model";

// Events
export const getEvents = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const events = await Event.find({ isActive: true }).sort({ createdAt: -1 }).lean();
    res.json({ events });
  } catch (err) { next(err); }
};

export const getAllEvents = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const events = await Event.find().sort({ createdAt: -1 }).lean();
    res.json({ events });
  } catch (err) { next(err); }
};

export const createEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await Event.create(req.body);
    res.status(201).json({ message: { en: "Event created", bn: "ইভেন্ট তৈরি হয়েছে" }, event });
  } catch (err) { next(err); }
};

export const updateEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!event) return res.status(404).json({ message: { en: "Event not found", bn: "ইভেন্ট পাওয়া যায়নি" } });
    res.json({ message: { en: "Event updated", bn: "ইভেন্ট আপডেট হয়েছে" }, event });
  } catch (err) { next(err); }
};

export const deleteEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: { en: "Event deleted", bn: "ইভেন্ট মুছে ফেলা হয়েছে" } });
  } catch (err) { next(err); }
};

// Notifications
export const getNotifications = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 }).limit(20).lean();
    res.json({ notifications });
  } catch (err) { next(err); }
};

export const createNotification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notification = await Notification.create({ ...req.body, createdBy: req.user!._id });
    res.status(201).json({ message: { en: "Notification sent", bn: "নোটিফিকেশন পাঠানো হয়েছে" }, notification });
  } catch (err) { next(err); }
};

export const deleteNotification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ message: { en: "Notification deleted", bn: "নোটিফিকেশন মুছে ফেলা হয়েছে" } });
  } catch (err) { next(err); }
};
