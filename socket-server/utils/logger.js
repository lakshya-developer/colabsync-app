/**
 * CollabSync Socket Server — Structured Logger
 *
 * Production-grade logging with levels, timestamps, and context.
 * Replaces scattered console.log calls.
 */

const LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

const LEVEL_LABELS = ["ERROR", "WARN", "INFO", "DEBUG"];

// Default to DEBUG in dev, INFO in production
const currentLevel =
  process.env.NODE_ENV === "production" ? LEVELS.INFO : LEVELS.DEBUG;

/**
 * Format a log entry as a structured string.
 * @param {"ERROR"|"WARN"|"INFO"|"DEBUG"} level
 * @param {string} message
 * @param {object} [meta]
 * @returns {string}
 */
function formatLog(level, message, meta) {
  const timestamp = new Date().toISOString();
  const base = `[${timestamp}] [${level}] ${message}`;

  if (meta && Object.keys(meta).length > 0) {
    // Safely stringify — handle circular refs
    try {
      return `${base} ${JSON.stringify(meta)}`;
    } catch {
      return `${base} [meta: unserializable]`;
    }
  }

  return base;
}

/**
 * Log at a specific level.
 * @param {number} level
 * @param {string} message
 * @param {object} [meta]
 */
function log(level, message, meta) {
  if (level > currentLevel) return;

  const formatted = formatLog(LEVEL_LABELS[level], message, meta);

  switch (level) {
    case LEVELS.ERROR:
      console.error(formatted);
      break;
    case LEVELS.WARN:
      console.warn(formatted);
      break;
    default:
      console.log(formatted);
  }
}

const logger = {
  /**
   * Log an error message.
   * @param {string} message
   * @param {object} [meta]
   */
  error(message, meta) {
    log(LEVELS.ERROR, message, meta);
  },

  /**
   * Log a warning message.
   * @param {string} message
   * @param {object} [meta]
   */
  warn(message, meta) {
    log(LEVELS.WARN, message, meta);
  },

  /**
   * Log an info message.
   * @param {string} message
   * @param {object} [meta]
   */
  info(message, meta) {
    log(LEVELS.INFO, message, meta);
  },

  /**
   * Log a debug message (suppressed in production).
   * @param {string} message
   * @param {object} [meta]
   */
  debug(message, meta) {
    log(LEVELS.DEBUG, message, meta);
  },

  /**
   * Create a child logger with pre-bound context (socketId, userId).
   * @param {object} context
   * @returns {object} Logger with bound context
   */
  child(context) {
    return {
      error: (msg, meta) => logger.error(msg, { ...context, ...meta }),
      warn: (msg, meta) => logger.warn(msg, { ...context, ...meta }),
      info: (msg, meta) => logger.info(msg, { ...context, ...meta }),
      debug: (msg, meta) => logger.debug(msg, { ...context, ...meta }),
    };
  },
};

module.exports = logger;
