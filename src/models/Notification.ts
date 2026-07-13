import mongoose, { Schema, Document } from "mongoose";

export interface NotificationMeta {
  resourceType?: "task" | "team" | "room" | "company" | "user" | "message";
  resourceId?: mongoose.Types.ObjectId;
  actorId?: mongoose.Types.ObjectId;
  actorName?: string;
}

export interface Notification extends Document {
  _id: mongoose.Types.ObjectId;
  recipientId: mongoose.Types.ObjectId;
  type:
    | "task_assigned"
    | "task_updated"
    | "task_completed"
    | "team_update"
    | "team_member_added"
    | "company_announcement"
    | "message"
    | "system";
  title: string;
  body?: string;
  meta?: NotificationMeta;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

const NotificationSchema: Schema<Notification> = new mongoose.Schema({
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
    index: true,
  },
  type: {
    type: String,
    required: true,
    enum: [
      "task_assigned",
      "task_updated",
      "task_completed",
      "team_update",
      "team_member_added",
      "company_announcement",
      "message",
      "system",
    ],
  },
  title: { type: String, required: true },
  body: { type: String, default: "" },
  meta: {
    resourceType: {
      type: String,
      enum: ["task", "team", "room", "company", "user", "message"],
    },
    resourceId: { type: mongoose.Schema.Types.ObjectId },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    actorName: { type: String },
  },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

// Compound index for efficient queries: unread notifications per user
NotificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

const NotificationModel =
  (mongoose.models.Notification as mongoose.Model<Notification>) ||
  mongoose.model<Notification>("Notification", NotificationSchema);

export default NotificationModel;
