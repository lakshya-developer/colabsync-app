/**
 * CollabSync Socket Server — Task Handler
 *
 * Task events are NOT client-originated.
 * Per the architecture, tasks flow through REST API:
 *   Client → POST /tasks → TaskService → DB → TaskEmitter → Sockets
 *
 * This handler only registers client-side listeners for:
 *   - Subscribing to task updates for specific tasks (optional)
 *
 * The actual task broadcasting is done by task.emitter.js,
 * which is called from REST API controllers.
 */

const logger = require("../utils/logger");

/**
 * Register task-related event listeners on a socket.
 * Currently minimal — task events originate from REST, not sockets.
 *
 * @param {import("socket.io").Server} io
 * @param {import("socket.io").Socket} socket
 */
module.exports = (io, socket) => {
  const log = logger.child({
    socketId: socket.id,
    userId: socket.user._id,
  });

  // Users automatically receive task events through their
  // team:<teamId> and user:<userId> rooms (joined on connect).
  // No additional subscriptions needed for the base implementation.

  log.debug("Task handler registered");
};
