/**
 * CollabSync Socket Server — Notification Handler
 *
 * Handles client-initiated notification events.
 *
 * Events:
 *   notification:read → Mark a notification as read in DB
 */

const EVENTS = require("../types/socket-events");
const notificationService = require("../services/notification.service");
const { validateNotificationReadPayload } = require("../utils/validators");
const logger = require("../utils/logger");

/**
 * Register notification event listeners on a socket.
 * @param {import("socket.io").Server} io
 * @param {import("socket.io").Socket} socket
 */
module.exports = (io, socket) => {
  const log = logger.child({
    socketId: socket.id,
    userId: socket.user._id,
  });

  // ─── notification:read ─────────────────────────────────
  socket.on(EVENTS.NOTIFICATION_READ, async (data, ack) => {
    const { valid, errors } = validateNotificationReadPayload(data);
    if (!valid) {
      log.warn("Invalid notification read payload", { errors });
      if (typeof ack === "function") {
        ack({ success: false, errors });
      }
      return;
    }

    // Mark as read — service validates ownership (recipientId match)
    const result = await notificationService.markAsRead(
      data.notificationId,
      socket.user._id
    );

    if (typeof ack === "function") {
      ack({
        success: result.success,
        ...(result.success
          ? { notification: result.notification }
          : { errors: ["Notification not found or already read"] }),
      });
    }

    if (result.success) {
      log.debug("Notification marked as read", {
        notificationId: data.notificationId,
      });
    }
  });

  log.debug("Notification handler registered");
};
