/**
 * CollabSync Socket Server — Notification Model
 *
 * New model for real-time notifications.
 * Collection: "notifications" (shared with Next.js Notification.ts).
 */

const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
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
  },
  {
    collection: "notifications",
  }
);

// Compound index for efficient queries: unread notifications per user
NotificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

module.exports =
  mongoose.models.Notification ||
  mongoose.model("Notification", NotificationSchema);
