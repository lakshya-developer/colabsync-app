/**
 * CollabSync Socket Server — IO Singleton
 *
 * Provides a shared Socket.IO instance across the application.
 * REST controllers and emitters use getIO() to broadcast events
 * without importing the server directly.
 */

/** @type {import("socket.io").Server | null} */
let io = null;

/**
 * Store the Socket.IO server instance.
 * Must be called once during server initialization.
 * @param {import("socket.io").Server} ioInstance
 */
function setIO(ioInstance) {
  if (!ioInstance) {
    throw new Error("[IO] Cannot set IO to a falsy value");
  }
  io = ioInstance;
}

/**
 * Retrieve the Socket.IO server instance.
 * Throws if called before setIO().
 * @returns {import("socket.io").Server}
 */
function getIO() {
  if (!io) {
    throw new Error(
      "[IO] Socket.IO instance not initialized. Call setIO() first."
    );
  }
  return io;
}

module.exports = { setIO, getIO };
