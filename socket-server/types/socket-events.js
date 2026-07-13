/**
 * CollabSync Socket Server — Event Constants
 *
 * Single source of truth for all Socket.IO event names.
 * Prevents typo-based bugs and provides documentation.
 */

const EVENTS = {
  // ─── Connection ────────────────────────────────────────
  CONNECTION: "connection",
  DISCONNECT: "disconnect",
  CONNECT_ERROR: "connect_error",

  // ─── Chat / Messages ──────────────────────────────────
  MESSAGE_SEND: "message:send",
  MESSAGE_NEW: "message:new",
  MESSAGE_TYPING: "message:typing",
  MESSAGE_READ: "message:read",

  // ─── Room ──────────────────────────────────────────────
  ROOM_JOIN: "room:join",
  ROOM_LEAVE: "room:leave",
  ROOM_JOINED: "room:joined",
  ROOM_LEFT: "room:left",

  // ─── Task ──────────────────────────────────────────────
  TASK_CREATED: "task:created",
  TASK_UPDATED: "task:updated",
  TASK_ASSIGNED: "task:assigned",
  TASK_COMPLETED: "task:completed",

  // ─── Notification ──────────────────────────────────────
  NOTIFICATION_NEW: "notification:new",
  NOTIFICATION_READ: "notification:read",

  // ─── Presence ──────────────────────────────────────────
  PRESENCE_UPDATE: "presence:update",
  PRESENCE_ONLINE: "presence:online",
  PRESENCE_OFFLINE: "presence:offline",

  // ─── Company ───────────────────────────────────────────
  COMPANY_UPDATE: "company:update",
  COMPANY_ANNOUNCEMENT: "company:announcement",

  // ─── Team ──────────────────────────────────────────────
  TEAM_UPDATE: "team:update",
  TEAM_MEMBER_ADDED: "team:member-added",

  // ─── System ────────────────────────────────────────────
  ERROR: "error",
  RATE_LIMITED: "rate:limited",
};

module.exports = EVENTS;
