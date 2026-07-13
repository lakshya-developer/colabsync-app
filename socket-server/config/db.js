/**
 * CollabSync Socket Server — MongoDB Connection
 * Handles connection with retry logic and event monitoring.
 */

const mongoose = require("mongoose");
const config = require("./index");
const logger = require("../utils/logger");

let isConnected = false;

/**
 * Connect to MongoDB with exponential backoff retry.
 * @returns {Promise<void>}
 */
async function connectDB() {
  if (isConnected) {
    logger.info("MongoDB already connected");
    return;
  }

  const { uri, options, retryAttempts, retryDelay } = config.mongodb;

  for (let attempt = 1; attempt <= retryAttempts; attempt++) {
    try {
      logger.info(
        `MongoDB connection attempt ${attempt}/${retryAttempts}...`
      );

      await mongoose.connect(uri, options);

      isConnected = true;
      logger.info("MongoDB connected successfully");
      break;
    } catch (error) {
      logger.error(`MongoDB connection attempt ${attempt} failed`, {
        error: error.message,
      });

      if (attempt === retryAttempts) {
        logger.error("All MongoDB connection attempts exhausted. Exiting.");
        process.exit(1);
      }

      // Exponential backoff: delay * 2^(attempt-1), capped at 30s
      const backoff = Math.min(retryDelay * Math.pow(2, attempt - 1), 30000);
      logger.info(`Retrying in ${backoff}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }

  // ─── Connection Event Monitoring ─────────────────────
  mongoose.connection.on("error", (err) => {
    logger.error("MongoDB connection error", { error: err.message });
    isConnected = false;
  });

  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB disconnected");
    isConnected = false;
  });

  mongoose.connection.on("reconnected", () => {
    logger.info("MongoDB reconnected");
    isConnected = true;
  });
}

/**
 * Gracefully close the MongoDB connection.
 * @returns {Promise<void>}
 */
async function disconnectDB() {
  if (!isConnected) return;

  try {
    await mongoose.connection.close();
    isConnected = false;
    logger.info("MongoDB connection closed gracefully");
  } catch (error) {
    logger.error("Error closing MongoDB connection", {
      error: error.message,
    });
  }
}

/**
 * Check if MongoDB is currently connected.
 * @returns {boolean}
 */
function isDBConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

module.exports = { connectDB, disconnectDB, isDBConnected };
