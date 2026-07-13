/**
 * CollabSync Socket Server — Presence Handler
 *
 * Handles client-initiated presence updates.
 *
 * Events:
 *   presence:update → Client sets status (online/away/dnd)
 */

const EVENTS = require("../types/socket-events");
const presenceEmitter = require("../emitters/presence.emitter");
const { validatePresencePayload } = require("../utils/validators");
const { rateLimitedHandler } = require("../middleware/rateLimit");
const logger = require("../utils/logger");

/**
 * Register presence event listeners on a socket.
 * @param {import("socket.io").Server} io
 * @param {import("socket.io").Socket} socket
 */
module.exports = (io, socket) => {
  const log = logger.child({
    socketId: socket.id,
    userId: socket.user._id,
  });

  // ─── presence:update ───────────────────────────────────
  socket.on(
    EVENTS.PRESENCE_UPDATE,
    rateLimitedHandler(socket, EVENTS.PRESENCE_UPDATE, (data) => {
      const { valid, errors } = validatePresencePayload(data);
      if (!valid) {
        log.warn("Invalid presence payload", { errors });
        return;
      }

      // Broadcast presence change to the user's company room
      presenceEmitter.update(socket.user.companyId, {
        userId: socket.user._id,
        userName: socket.user.name,
        status: data.status,
      });

      log.debug("Presence updated", { status: data.status });
    })
  );

  log.debug("Presence handler registered");
};
