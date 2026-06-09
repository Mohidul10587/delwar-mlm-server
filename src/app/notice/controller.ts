import { Request, Response, NextFunction } from "express";
import { Notice } from "./model";
import { Server } from "socket.io";

let io: Server;
export const setSocketIO = (socketIO: Server) => { io = socketIO; };

export const createNotice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, message } = req.body;
    const notice = await Notice.create({ title, message, createdBy: req.user!._id });
    const populated = await notice.populate("createdBy", "name");
    io?.emit("new_notice", populated);
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
};

export const getNotices = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const notices = await Notice.find().populate("createdBy", "name").sort({ createdAt: -1 }).limit(50);
    res.json(notices);
  } catch (err) {
    next(err);
  }
};

export const deleteNotice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await Notice.findByIdAndDelete(req.params.id);
    io?.emit("delete_notice", req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    next(err);
  }
};
