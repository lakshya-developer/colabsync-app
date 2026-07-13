/**
 * CollabSync Socket Server — Entry Point
 *
 * Production-ready Socket.IO server with:
 *   - MongoDB connection with retry
 *   - CORS-configured Socket.IO
 *   - JWT authentication middleware
 *   - Connection lifecycle management
 *   - Health check endpoint
 *   - Graceful shutdown
 */

const config = require("./config");
const logger = require("./utils/logger");
const { connectDB, disconnectDB, isDBConnected } = require("./config/db");
const { setIO } = require("./io");
const socketAuth = require("./middleware/socketAuth");
const { registerConnectionEvents } = require("./events/connection.events");

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

// ─── Express App ─────────────────────────────────────────
const app = express();

app.use(
  cors({
    origin: config.cors.origins,
    methods: config.cors.methods,
    credentials: config.cors.credentials,
  })
);

app.use(express.json());

// ─── Health Check Endpoint ───────────────────────────────
app.get("/health", (req, res) => {
  const status = {
    status: isDBConnected() ? "ok" : "degraded",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    mongodb: isDBConnected() ? "connected" : "disconnected",
    environment: config.nodeEnv,
  };

  const httpStatus = isDBConnected() ? 200 : 503;
  res.status(httpStatus).json(status);
});

// ─── HTTP Server ─────────────────────────────────────────
const server = http.createServer(app);

// ─── Socket.IO Server ────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: config.cors.origins,
    methods: config.cors.methods,
    credentials: config.cors.credentials,
  },
  pingTimeout: config.socket.pingTimeout,
  pingInterval: config.socket.pingInterval,
  maxHttpBufferSize: config.socket.maxHttpBufferSize,
  connectTimeout: config.socket.connectTimeout,
  // Production: disable serving client bundle
  serveClient: false,
});

// Store IO singleton for use by emitters and REST controllers
setIO(io);

// ─── Middleware ──────────────────────────────────────────
io.use(socketAuth);

// ─── Connection Lifecycle ────────────────────────────────
registerConnectionEvents(io);

// ─── Startup ─────────────────────────────────────────────
async function start() {
  logger.info("Starting CollabSync Socket Server...", {
    nodeEnv: config.nodeEnv,
    port: config.port,
  });

  // 1. Connect to MongoDB
  await connectDB();

  // 2. Start HTTP + Socket.IO server
  server.listen(config.port, () => {
    logger.info(
      `Socket server listening on http://localhost:${config.port}`,
      {
        cors: config.cors.origins,
        pingTimeout: config.socket.pingTimeout,
        pingInterval: config.socket.pingInterval,
      }
    );
  });
}

// ─── Graceful Shutdown ───────────────────────────────────
function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  // 1. Stop accepting new connections
  server.close(async () => {
    logger.info("HTTP server closed");

    // 2. Disconnect all sockets
    io.disconnectSockets(true);
    logger.info("All sockets disconnected");

    // 3. Close MongoDB connection
    await disconnectDB();

    logger.info("Graceful shutdown complete");
    process.exit(0);
  });

  // Force exit after 10 seconds if graceful shutdown hangs
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// ─── Unhandled Errors ────────────────────────────────────
process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", {
    error: error.message,
    stack: error.stack,
  });
  gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection", {
    reason: reason instanceof Error ? reason.message : String(reason),
  });
});

// ─── Start the server ────────────────────────────────────
start().catch((error) => {
  logger.error("Failed to start server", { error: error.message });
  process.exit(1);
});
