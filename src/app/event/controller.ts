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
    const { image, video } = req.body;
    if (image && video)
      return res.status(400).json({ message: "Provide either image or video, not both" });
    const event = await Event.create(req.body);
    res.status(201).json({ message: "Event created", event });
  } catch (err) { next(err); }
};

export const updateEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { image, video } = req.body;
    if (image && video)
      return res.status(400).json({ message: "Provide either image or video, not both" });
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.json({ message: "Event updated", event });
  } catch (err) { next(err); }
};

export const deleteEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: "Event deleted" });
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
    res.status(201).json({ message: "Notification sent", notification });
  } catch (err) { next(err); }
};

export const deleteNotification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ message: "Notification deleted" });
  } catch (err) { next(err); }
};
