/**
 * CollabSync Socket Server — Chat Service
 *
 * Database operations for chat: message persistence,
 * room membership validation, and room metadata updates.
 * 
 * This is the service layer — no socket emit logic here.
 */

const Message = require("../models/Message");
const Room = require("../models/Room");
const logger = require("../utils/logger");

/**
 * Validate that a user is a participant of a room.
 * @param {string} userId
 * @param {string} roomId
 * @returns {Promise<{ isMember: boolean, room: object|null }>}
 */
async function validateMembership(userId, roomId) {
  try {
    // First, check if the room is general/announcement — those are open to all company members
    const room = await Room.findOne({
      _id: roomId,
      "meta.isArchived": { $ne: true },
    }).lean();

    if (!room) return { isMember: false, room: null };

    // General and announcement rooms are open to all company members
    if (room.type === 'general' || room.type === 'announcement') {
      return { isMember: true, room };
    }

    // For direct and team rooms, check explicit participant enrollment
    const isMember = room.participantsId
      ? room.participantsId.some((id) => id.toString() === userId.toString())
      : false;

    return { isMember, room };
  } catch (error) {
    logger.error("Error validating room membership", {
      userId,
      roomId,
      error: error.message,
    });
    return { isMember: false, room: null };
  }
}

/**
 * Save a message to the database and update room metadata.
 * @param {object} data
 * @param {string} data.roomId
 * @param {string} data.senderId
 * @param {string} data.content
 * @param {Array} [data.attachments]
 * @returns {Promise<object|null>} The saved message, or null on failure
 */
async function saveMessage(data) {
  try {
    const message = new Message({
      roomId: data.roomId,
      senderId: data.senderId,
      content: data.content,
      attachments: data.attachments || [],
      createdAt: new Date(),
    });

    const saved = await message.save();

    // Update room's lastMessageAt
    await Room.findByIdAndUpdate(data.roomId, {
      "meta.lastMessageAt": saved.createdAt,
    });

    logger.debug("Message saved", {
      messageId: saved._id.toString(),
      roomId: data.roomId,
      senderId: data.senderId,
    });

    return saved.toObject();
  } catch (error) {
    logger.error("Error saving message", {
      roomId: data.roomId,
      senderId: data.senderId,
      error: error.message,
    });
    return null;
  }
}

/**
 * Get a room by ID (for authorization checks).
 * @param {string} roomId
 * @returns {Promise<object|null>}
 */
async function getRoomById(roomId) {
  try {
    return await Room.findById(roomId).lean();
  } catch (error) {
    logger.error("Error fetching room", {
      roomId,
      error: error.message,
    });
    return null;
  }
}

module.exports = {
  validateMembership,
  saveMessage,
  getRoomById,
};
