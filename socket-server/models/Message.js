/**
 * CollabSync Socket Server — Message Model
 *
 * Points to the same "messages" collection as the Next.js Message model.
 * Used by chat.service.js to persist messages before broadcasting.
 */

const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Room",
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    content: { type: String, required: true },
    attachments: [
      {
        url: { type: String, required: true },
        filename: { type: String, required: true },
        fileType: { type: String, required: true },
        size: { type: Number, required: true },
      },
    ],
    createdAt: { type: Date, default: Date.now },
    editedAt: { type: Date },
  },
  {
    collection: "messages",
  }
);

module.exports =
  mongoose.models.Message || mongoose.model("Message", MessageSchema);
