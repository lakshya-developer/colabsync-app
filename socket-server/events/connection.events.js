/**
 * CollabSync Socket Server — Connection Lifecycle
 *
 * Manages the full connection lifecycle:
 *   Connect  → Auth verified → Join rooms → Set online → Register handlers
 *   Disconnect → Set offline → Broadcast presence → Cleanup
 *
 * This is the single entry point for all socket event registration.
 */

const config = require("../config");
const EVENTS = require("../types/socket-events");
const presenceService = require("../services/presence.service");
const presenceEmitter = require("../emitters/presence.emitter");
const { cleanupSocket } = require("../middleware/rateLimit");
const logger = require("../utils/logger");

// ─── Domain Handlers ─────────────────────────────────────
const chatHandler = require("../handlers/chat.handler");
const taskHandler = require("../handlers/task.handler");
const notificationHandler = require("../handlers/notification.handler");
const presenceHandler = require("../handlers/presence.handler");

// ─── User model for fetching team info ───────────────────
const User = require("../models/User");

/**
 * Register the connection event on the Socket.IO server.
 * @param {import("socket.io").Server} io
 */
function registerConnectionEvents(io) {
  io.on(EVENTS.CONNECTION, async (socket) => {
    const { user } = socket;
    const log = logger.child({
      socketId: socket.id,
      userId: user._id,
    });

    log.info("User connected", {
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    });

    try {
      // ─── 1. Auto-join personal, company, and team rooms ──
      const userRoom = `${config.roomPrefix.user}${user._id}`;
      const companyRoom = `${config.roomPrefix.company}${user.companyId}`;

      socket.join(userRoom);
      socket.join(companyRoom);

      log.debug("Joined rooms", { userRoom, companyRoom });

      // Fetch team assignment from DB to join team room
      const dbUser = await User.findById(user._id, {
        "meta.assignedTeamId": 1,
        name: 1,
        avatarUrl: 1,
      }).lean();

      let teamRoom = null;
      if (dbUser?.meta?.assignedTeamId) {
        teamRoom = `${config.roomPrefix.team}${dbUser.meta.assignedTeamId}`;
        socket.join(teamRoom);
        log.debug("Joined team room", { teamRoom });
      }

      // ─── 2. Update presence in database ──────────────────
      await presenceService.setOnline(user._id);

      // ─── 3. Broadcast online presence to company ─────────
      presenceEmitter.online(user.companyId, {
        _id: user._id,
        name: dbUser?.name || user.name,
        avatarUrl: dbUser?.avatarUrl || null,
      });

      // ─── 4. Register domain event handlers ───────────────
      chatHandler(io, socket);
      taskHandler(io, socket);
      notificationHandler(io, socket);
      presenceHandler(io, socket);

      // ─── 5. Handle disconnect ────────────────────────────
      socket.on(EVENTS.DISCONNECT, async (reason) => {
        log.info("User disconnected", { reason });

        try {
          // Update presence in database
          await presenceService.setOffline(user._id);

          // Broadcast offline presence to company
          presenceEmitter.offline(user.companyId, {
            _id: user._id,
            name: dbUser?.name || user.name,
            avatarUrl: dbUser?.avatarUrl || null,
          });
        } catch (error) {
          log.error("Error during disconnect cleanup", {
            error: error.message,
          });
        }

        // Cleanup rate limiter data for this socket
        cleanupSocket(socket.id);
      });

      // ─── 6. Handle errors on this socket ─────────────────
      socket.on(EVENTS.ERROR, (error) => {
        log.error("Socket error", { error: error.message });
      });
    } catch (error) {
      log.error("Error during connection setup", {
        error: error.message,
      });
      socket.disconnect(true);
    }
  });
}

module.exports = { registerConnectionEvents };
