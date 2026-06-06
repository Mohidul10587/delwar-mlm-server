import { Router } from "express";
import { getEvents, getAllEvents, createEvent, updateEvent, deleteEvent, getNotifications, createNotification, deleteNotification } from "./controller";
import { verifyUser, verifyAdmin, verifySuperAdmin } from "../../middleware/auth";

export const eventRouter = Router();
export const notificationRouter = Router();

eventRouter.get("/", getEvents);
eventRouter.get("/all", verifyAdmin, getAllEvents);
eventRouter.post("/", verifySuperAdmin, createEvent);
eventRouter.put("/:id", verifySuperAdmin, updateEvent);
eventRouter.delete("/:id", verifySuperAdmin, deleteEvent);

notificationRouter.get("/", verifyUser, getNotifications);
notificationRouter.post("/", verifyAdmin, createNotification);
notificationRouter.delete("/:id", verifySuperAdmin, deleteNotification);
