/**
 * CollabSync Socket Server — Centralized Configuration
 * All settings sourced from environment variables with production defaults.
 */

require("dotenv").config();
const logger = require("../utils/logger");

const config = {
  // ─── Server ────────────────────────────────────────────
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",

  // ─── CORS ──────────────────────────────────────────────
  cors: {
    origins: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
      : ["http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true,
  },

  // ─── MongoDB ───────────────────────────────────────────
  mongodb: {
    uri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/collabsync",
    options: {
      maxPoolSize: parseInt(process.env.MONGO_POOL_SIZE, 10) || 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    },
    retryAttempts: parseInt(process.env.MONGO_RETRY_ATTEMPTS, 10) || 5,
    retryDelay: parseInt(process.env.MONGO_RETRY_DELAY, 10) || 3000,
  },

  // ─── JWT (aligned with NextAuth) ───────────────────────
  jwt: {
    secret: process.env.NEXTAUTH_SECRET || "dev-secret-change-me",
  },

  // ─── Socket.IO ─────────────────────────────────────────
  socket: {
    pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT, 10) || 60000,
    pingInterval: parseInt(process.env.SOCKET_PING_INTERVAL, 10) || 25000,
    maxHttpBufferSize: parseInt(process.env.SOCKET_MAX_BUFFER, 10) || 1e6, // 1MB
    connectTimeout: parseInt(process.env.SOCKET_CONNECT_TIMEOUT, 10) || 10000,
  },

  // ─── Rate Limiting ────────────────────────────────────
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW, 10) || 1000,
    maxEvents: parseInt(process.env.RATE_LIMIT_MAX, 10) || 20,
    // Per-event overrides
    perEvent: {
      "message:send": { windowMs: 1000, max: 5 },
      "message:typing": { windowMs: 2000, max: 3 },
    },
  },

  // ─── Room Prefixes ────────────────────────────────────
  roomPrefix: {
    user: "user:",
    company: "company:",
    team: "team:",
    room: "room:",
    meeting: "meeting:",
  },
};

// ─── Validation ──────────────────────────────────────────
function validateConfig() {
  const required = [
    ["mongodb.uri", process.env.MONGODB_URI],
    ["jwt.secret", process.env.NEXTAUTH_SECRET],
  ];

  const missing = required.filter(([, value]) => !value);

  if (missing.length > 0) {
    const names = missing.map(([name]) => name).join(", ");

    if (config.isProduction) {
      throw new Error(
        `[Config] Missing required environment variables: ${names}`
      );
    }

    logger.warn(
      `[Config] Using development defaults for missing environment variables: ${names}`
    );
  }
}

validateConfig();

module.exports = config;
