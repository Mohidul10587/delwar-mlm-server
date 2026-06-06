import { Schema, model, Document, Types } from "mongoose";

export interface IEvent extends Document {
  title: string;
  description: string;
  image: string;
  video: string;
  isActive: boolean;
}

export interface INotification extends Document {
  title: string;
  body: string;
  isGlobal: boolean;
  createdBy: Types.ObjectId;
}

const EventSchema = new Schema<IEvent>(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    image: { type: String, default: "" },
    video: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const NotificationSchema = new Schema<INotification>(
  {
    title: { type: String, required: true },
    body: { type: String, required: true },
    isGlobal: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const Event = model<IEvent>("Event", EventSchema);
export const Notification = model<INotification>("Notification", NotificationSchema);
