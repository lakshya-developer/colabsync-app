/**
 * CollabSync Socket Server — Notification Emitter
 *
 * Broadcasts notification events to specific users.
 * Used by all other emitters when they need to notify a user.
 */

const { emitToUser } = require("../utils/emit");
const EVENTS = require("../types/socket-events");
const logger = require("../utils/logger");

/**
 * Send a notification to a specific user (all their devices).
 * @param {string} userId
 * @param {object} notification - The persisted notification object
 */
function send(userId, notification) {
  logger.debug("NotificationEmitter → send", {
    userId,
    notificationId: notification._id,
    type: notification.type,
  });

  emitToUser(userId, EVENTS.NOTIFICATION_NEW, {
    notification,
    timestamp: new Date().toISOString(),
  });
}

module.exports = { send };
