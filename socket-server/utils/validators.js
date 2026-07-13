/**
 * CollabSync Socket Server — Payload Validators
 *
 * Validation helpers for socket event payloads.
 * Lightweight — no external validation library needed.
 */

const mongoose = require("mongoose");

/**
 * Check if a value is a valid MongoDB ObjectId string.
 * @param {string} id
 * @returns {boolean}
 */
function isValidObjectId(id) {
  return typeof id === "string" && mongoose.Types.ObjectId.isValid(id);
}

/**
 * Check if a string is non-empty and within length bounds.
 * @param {string} value
 * @param {number} [minLength=1]
 * @param {number} [maxLength=5000]
 * @returns {boolean}
 */
function isValidString(value, minLength = 1, maxLength = 5000) {
  return (
    typeof value === "string" &&
    value.trim().length >= minLength &&
    value.trim().length <= maxLength
  );
}

/**
 * Validate a message:send payload.
 * @param {object} data
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateMessagePayload(data) {
  const errors = [];

  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["Payload must be an object"] };
  }

  if (!isValidObjectId(data.roomId)) {
    errors.push("Invalid or missing roomId");
  }

  if (!isValidString(data.content, 1, 5000)) {
    errors.push("Content must be 1-5000 characters");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a room:join payload.
 * @param {object} data
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateRoomJoinPayload(data) {
  const errors = [];

  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["Payload must be an object"] };
  }

  if (!isValidObjectId(data.roomId)) {
    errors.push("Invalid or missing roomId");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a notification:read payload.
 * @param {object} data
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateNotificationReadPayload(data) {
  const errors = [];

  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["Payload must be an object"] };
  }

  if (!isValidObjectId(data.notificationId)) {
    errors.push("Invalid or missing notificationId");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a presence:update payload.
 * @param {object} data
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validatePresencePayload(data) {
  const errors = [];

  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["Payload must be an object"] };
  }

  const validStatuses = ["online", "away", "dnd", "offline"];
  if (!validStatuses.includes(data.status)) {
    errors.push(`Status must be one of: ${validStatuses.join(", ")}`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a message:typing payload.
 * @param {object} data
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateTypingPayload(data) {
  const errors = [];

  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["Payload must be an object"] };
  }

  if (!isValidObjectId(data.roomId)) {
    errors.push("Invalid or missing roomId");
  }

  if (typeof data.isTyping !== "boolean") {
    errors.push("isTyping must be a boolean");
  }

  return { valid: errors.length === 0, errors };
}

module.exports = {
  isValidObjectId,
  isValidString,
  validateMessagePayload,
  validateRoomJoinPayload,
  validateNotificationReadPayload,
  validatePresencePayload,
  validateTypingPayload,
};
