/**
 * CollabSync Socket Server — Room Model
 *
 * Points to the same "rooms" collection as the Next.js Room model.
 * Only includes fields needed for socket authorization and metadata updates.
 */

const mongoose = require("mongoose");

const RoomSchema = new mongoose.Schema(
  {
    name: { type: String },
    description: { type: String },
    type: { type: String, required: true },
    participantsId: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    meta: {
      createdAt: { type: Date, default: Date.now },
      lastMessageAt: { type: Date, default: Date.now },
      isArchived: { type: Boolean, default: false },
      customName: { type: String },
    },
  },
  {
    collection: "rooms",
  }
);

module.exports =
  mongoose.models.Room || mongoose.model("Room", RoomSchema);
