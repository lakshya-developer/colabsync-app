/**
 * CollabSync Socket Server — User Model
 *
 * Lightweight JS model pointing to the same "users" collection
 * used by the Next.js TypeScript models. Only includes fields
 * needed by the socket server.
 */

const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "manager", "employee"],
      required: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },
    avatarUrl: String,
    isVerified: { type: Boolean, default: false },
    meta: {
      assignedTeamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Team",
      },
      employeeCode: String,
      designation: String,
    },
    isOnline: { type: Boolean, default: false },
    lastActive: { type: Date, default: null },
  },
  {
    // Do NOT add timestamps — matches the original schema
    collection: "users",
  }
);

module.exports =
  mongoose.models.User || mongoose.model("User", UserSchema);
