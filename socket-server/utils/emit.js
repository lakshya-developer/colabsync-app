/**
 * CollabSync Socket Server — Emit Helpers
 *
 * Convenience wrappers for emitting events to specific room types.
 * All use the IO singleton — never import the server directly.
 */

const { getIO } = require("../io");
const config = require("../config");
const logger = require("./logger");

/**
 * Emit an event to a specific user's personal room.
 * Supports multi-device — all sockets in user:<userId> receive it.
 * @param {string} userId
 * @param {string} event
 * @param {object} data
 */
function emitToUser(userId, event, data) {
  const room = `${config.roomPrefix.user}${userId}`;
  logger.debug(`Emit → ${room} [${event}]`);
  getIO().to(room).emit(event, data);
}

/**
 * Emit an event to all users in a company.
 * @param {string} companyId
 * @param {string} event
 * @param {object} data
 */
function emitToCompany(companyId, event, data) {
  const room = `${config.roomPrefix.company}${companyId}`;
  logger.debug(`Emit → ${room} [${event}]`);
  getIO().to(room).emit(event, data);
}

/**
 * Emit an event to all members of a team.
 * @param {string} teamId
 * @param {string} event
 * @param {object} data
 */
function emitToTeam(teamId, event, data) {
  const room = `${config.roomPrefix.team}${teamId}`;
  logger.debug(`Emit → ${room} [${event}]`);
  getIO().to(room).emit(event, data);
}

/**
 * Emit an event to all users in a chat room.
 * @param {string} roomId
 * @param {string} event
 * @param {object} data
 */
function emitToRoom(roomId, event, data) {
  const room = `${config.roomPrefix.room}${roomId}`;
  logger.debug(`Emit → ${room} [${event}]`);
  getIO().to(room).emit(event, data);
}

module.exports = {
  emitToUser,
  emitToCompany,
  emitToTeam,
  emitToRoom,
};
