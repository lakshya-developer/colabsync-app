/**
 * CollabSync Socket Server — Rate Limiter Middleware
 *
 * In-memory per-socket rate limiter to protect against event flooding.
 * Supports global limits and per-event-type overrides.
 */

const config = require("../config");
const logger = require("../utils/logger");
const EVENTS = require("../types/socket-events");

/**
 * Sliding window counter for rate limiting.
 */
class SlidingWindowCounter {
  constructor() {
    /** @type {Map<string, number[]>} key → array of timestamps */
    this.windows = new Map();
  }

  /**
   * Check if a request is allowed and record it.
   * @param {string} key - Unique identifier (socketId or socketId:eventName)
   * @param {number} windowMs - Window duration in ms
   * @param {number} max - Max allowed events in the window
   * @returns {boolean} true if allowed, false if rate limited
   */
  isAllowed(key, windowMs, max) {
    const now = Date.now();
    let timestamps = this.windows.get(key);

    if (!timestamps) {
      timestamps = [];
      this.windows.set(key, timestamps);
    }

    // Remove timestamps outside the window
    const cutoff = now - windowMs;
    while (timestamps.length > 0 && timestamps[0] <= cutoff) {
      timestamps.shift();
    }

    if (timestamps.length >= max) {
      return false;
    }

    timestamps.push(now);
    return true;
  }

  /**
   * Remove all entries for a socket (on disconnect cleanup).
   * @param {string} socketId
   */
  cleanup(socketId) {
    for (const key of this.windows.keys()) {
      if (key.startsWith(socketId)) {
        this.windows.delete(key);
      }
    }
  }
}

// Shared counter instance
const counter = new SlidingWindowCounter();

// Periodic cleanup of stale entries (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of counter.windows.entries()) {
    // Remove entries that are entirely stale (no activity for 60s)
    if (timestamps.length === 0 || now - timestamps[timestamps.length - 1] > 60000) {
      counter.windows.delete(key);
    }
  }
}, 5 * 60 * 1000).unref(); // .unref() so it doesn't prevent process exit

/**
 * Create a rate-limited event handler wrapper.
 *
 * Usage:
 *   socket.on("message:send", rateLimitedHandler(socket, "message:send", handler));
 *
 * @param {import("socket.io").Socket} socket
 * @param {string} eventName
 * @param {function} handler - Original event handler
 * @returns {function} Wrapped handler with rate limiting
 */
function rateLimitedHandler(socket, eventName, handler) {
  return (...args) => {
    // Check per-event limit first, then fall back to global
    const eventConfig = config.rateLimit.perEvent[eventName];
    const windowMs = eventConfig?.windowMs || config.rateLimit.windowMs;
    const max = eventConfig?.max || config.rateLimit.maxEvents;

    const key = `${socket.id}:${eventName}`;

    if (!counter.isAllowed(key, windowMs, max)) {
      logger.warn("Rate limited", {
        socketId: socket.id,
        userId: socket.user?._id,
        event: eventName,
      });

      socket.emit(EVENTS.RATE_LIMITED, {
        event: eventName,
        message: "Too many requests. Please slow down.",
        retryAfter: Math.ceil(windowMs / 1000),
      });
      return;
    }

    handler(...args);
  };
}

/**
 * Cleanup rate limit data when a socket disconnects.
 * Should be called in the disconnect handler.
 * @param {string} socketId
 */
function cleanupSocket(socketId) {
  counter.cleanup(socketId);
}

module.exports = { rateLimitedHandler, cleanupSocket };
