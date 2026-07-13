/**
 * CollabSync Socket Server — Chat Handler
 *
 * Socket event controller for chat functionality.
 * Follows the core principle: Validate → Persist → Emit.
 *
 * Events handled:
 *   message:send   → Validate membership → Save → Broadcast
 *   message:typing → Validate membership → Broadcast (transient)
 *   message:read   → Broadcast read receipt
 *   room:join      → Verify participant → Join socket room
 *   room:leave     → Leave socket room
 */

const EVENTS = require("../types/socket-events");
const chatService = require("../services/chat.service");
const chatEmitter = require("../emitters/chat.emitter");
const { rateLimitedHandler } = require("../middleware/rateLimit");
const {
  validateMessagePayload,
  validateRoomJoinPayload,
  validateTypingPayload,
  isValidObjectId,
} = require("../utils/validators");
const config = require("../config");
const logger = require("../utils/logger");

/**
 * Register chat event listeners on a socket.
 * @param {import("socket.io").Server} io
 * @param {import("socket.io").Socket} socket
 */
module.exports = (io, socket) => {
  const log = logger.child({
    socketId: socket.id,
    userId: socket.user._id,
  });

  // ─── message:send ──────────────────────────────────────
  socket.on(
    EVENTS.MESSAGE_SEND,
    rateLimitedHandler(socket, EVENTS.MESSAGE_SEND, async (data, ack) => {
      // 1. Validate payload
      const { valid, errors } = validateMessagePayload(data);
      if (!valid) {
        log.warn("Invalid message payload", { errors });
        if (typeof ack === "function") {
          ack({ success: false, errors });
        }
        return;
      }

      // 2. Validate room membership
      const { isMember } = await chatService.validateMembership(
        socket.user._id,
        data.roomId
      );
      if (!isMember) {
        log.warn("Message send denied: not a room member", {
          roomId: data.roomId,
        });
        if (typeof ack === "function") {
          ack({
            success: false,
            errors: ["You are not a member of this room"],
          });
        }
        return;
      }

      // 3. Persist message to database
      const message = await chatService.saveMessage({
        roomId: data.roomId,
        senderId: socket.user._id,
        content: data.content,
        attachments: data.attachments || [],
      });

      if (!message) {
        log.error("Failed to save message");
        if (typeof ack === "function") {
          ack({ success: false, errors: ["Failed to save message"] });
        }
        return;
      }

      // 4. Broadcast to all room members
      chatEmitter.newMessage(data.roomId, message);

      // 5. Acknowledge success to sender
      if (typeof ack === "function") {
        ack({ success: true, message });
      }

      log.debug("Message sent successfully", {
        messageId: message._id,
        roomId: data.roomId,
      });
    })
  );

  // ─── message:typing ────────────────────────────────────
  socket.on(
    EVENTS.MESSAGE_TYPING,
    rateLimitedHandler(socket, EVENTS.MESSAGE_TYPING, async (data) => {
      const { valid, errors } = validateTypingPayload(data);
      if (!valid) {
        log.warn("Invalid typing payload", { errors });
        return;
      }

      // Validate membership (lightweight — could cache this)
      const { isMember } = await chatService.validateMembership(
        socket.user._id,
        data.roomId
      );
      if (!isMember) return;

      // Transient event — no DB persistence
      chatEmitter.typing(data.roomId, {
        userId: socket.user._id,
        userName: socket.user.name,
        isTyping: data.isTyping,
      });
    })
  );

  // ─── message:read ──────────────────────────────────────
  socket.on(EVENTS.MESSAGE_READ, async (data) => {
    if (!data || !isValidObjectId(data.roomId)) return;

    chatEmitter.readReceipt(data.roomId, {
      userId: socket.user._id,
      lastReadMessageId: data.lastReadMessageId || null,
    });
  });

  // ─── room:join ─────────────────────────────────────────
  socket.on(EVENTS.ROOM_JOIN, async (data, ack) => {
    const { valid, errors } = validateRoomJoinPayload(data);
    if (!valid) {
      log.warn("Invalid room join payload", { errors });
      if (typeof ack === "function") {
        ack({ success: false, errors });
      }
      return;
    }

    // Verify the user is a participant of this room
    const { isMember, room } = await chatService.validateMembership(
      socket.user._id,
      data.roomId
    );

    if (!isMember) {
      log.warn("Room join denied: not a participant", {
        roomId: data.roomId,
      });
      if (typeof ack === "function") {
        ack({ success: false, errors: ["You are not a member of this room"] });
      }
      return;
    }

    // Verify company isolation — room must belong to user's company
    if (room.companyId.toString() !== socket.user.companyId.toString()) {
      log.warn("Room join denied: company mismatch", {
        roomId: data.roomId,
        roomCompany: room.companyId,
        userCompany: socket.user.companyId,
      });
      if (typeof ack === "function") {
        ack({ success: false, errors: ["Access denied"] });
      }
      return;
    }

    const socketRoom = `${config.roomPrefix.room}${data.roomId}`;
    socket.join(socketRoom);

    log.debug("Joined chat room", { roomId: data.roomId });

    if (typeof ack === "function") {
      ack({ success: true, roomId: data.roomId });
    }

    // Notify other room members
    socket.to(socketRoom).emit(EVENTS.ROOM_JOINED, {
      userId: socket.user._id,
      userName: socket.user.name,
      roomId: data.roomId,
      timestamp: new Date().toISOString(),
    });
  });

  // ─── room:leave ────────────────────────────────────────
  socket.on(EVENTS.ROOM_LEAVE, (data) => {
    if (!data || !isValidObjectId(data.roomId)) return;

    const socketRoom = `${config.roomPrefix.room}${data.roomId}`;
    socket.leave(socketRoom);

    log.debug("Left chat room", { roomId: data.roomId });

    socket.to(socketRoom).emit(EVENTS.ROOM_LEFT, {
      userId: socket.user._id,
      userName: socket.user.name,
      roomId: data.roomId,
      timestamp: new Date().toISOString(),
    });
  });
};
