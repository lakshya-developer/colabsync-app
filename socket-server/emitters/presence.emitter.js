/**
 * CollabSync Socket Server — Presence Emitter
 *
 * Broadcasts presence status changes to company rooms.
 */

const { emitToCompany } = require("../utils/emit");
const EVENTS = require("../types/socket-events");
const logger = require("../utils/logger");

/**
 * Broadcast a user's presence status change to their company.
 * @param {string} companyId
 * @param {object} data
 * @param {string} data.userId
 * @param {string} data.userName
 * @param {string} [data.avatarUrl]
 * @param {string} data.status - "online" | "away" | "dnd" | "offline"
 */
function update(companyId, data) {
  logger.debug("PresenceEmitter → update", {
    companyId,
    userId: data.userId,
    status: data.status,
  });

  emitToCompany(companyId, EVENTS.PRESENCE_UPDATE, {
    userId: data.userId,
    userName: data.userName,
    avatarUrl: data.avatarUrl || null,
    status: data.status,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Broadcast that a user came online.
 * @param {string} companyId
 * @param {object} user - { _id, name, avatarUrl }
 */
function online(companyId, user) {
  update(companyId, {
    userId: user._id.toString(),
    userName: user.name,
    avatarUrl: user.avatarUrl,
    status: "online",
  });
}

/**
 * Broadcast that a user went offline.
 * @param {string} companyId
 * @param {object} user - { _id, name, avatarUrl }
 */
function offline(companyId, user) {
  update(companyId, {
    userId: user._id.toString(),
    userName: user.name,
    avatarUrl: user.avatarUrl,
    status: "offline",
  });
}

module.exports = { update, online, offline };
