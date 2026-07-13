/**
 * CollabSync Socket Server — Chat Emitter
 *
 * Reusable broadcast functions for chat events.
 * Only emits — no business logic or database operations.
 */

const { emitToRoom } = require("../utils/emit");
const EVENTS = require("../types/socket-events");
const logger = require("../utils/logger");

/**
 * Broadcast a new message to all users in a chat room.
 * @param {string} roomId
 * @param {object} message - The persisted message object
 */
function newMessage(roomId, message) {
  logger.debug("ChatEmitter → newMessage", { roomId });
  emitToRoom(roomId, EVENTS.MESSAGE_NEW, {
    message,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Broadcast typing indicator to a chat room.
 * @param {string} roomId
 * @param {object} data
 * @param {string} data.userId
 * @param {string} data.userName
 * @param {boolean} data.isTyping
 */
function typing(roomId, data) {
  emitToRoom(roomId, EVENTS.MESSAGE_TYPING, {
    userId: data.userId,
    userName: data.userName,
    isTyping: data.isTyping,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Broadcast read receipt to a chat room.
 * @param {string} roomId
 * @param {object} data
 * @param {string} data.userId
 * @param {string} data.lastReadMessageId
 */
function readReceipt(roomId, data) {
  emitToRoom(roomId, EVENTS.MESSAGE_READ, {
    userId: data.userId,
    lastReadMessageId: data.lastReadMessageId,
    timestamp: new Date().toISOString(),
  });
}

module.exports = { newMessage, typing, readReceipt };
