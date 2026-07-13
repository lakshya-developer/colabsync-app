/**
 * CollabSync Socket Server — Socket Authentication Middleware
 *
 * Verifies JWT tokens on Socket.IO handshake.
 *
 * Auth flow:
 *   1. Client calls POST /api/socket-token (Next.js) to get a standard JWT
 *   2. Client passes token in socket.handshake.auth.token
 *   3. This middleware verifies the JWT with NEXTAUTH_SECRET
 *   4. On success, attaches socket.user
 */

const jwt = require("jsonwebtoken");
const config = require("../config");
const logger = require("../utils/logger");

/**
 * Socket.IO authentication middleware.
 * Expects token in socket.handshake.auth.token.
 *
 * On success, attaches a structured `socket.user` object:
 *   { _id, email, name, role, companyId, isVerified }
 *
 * @param {import("socket.io").Socket} socket
 * @param {function} next
 */
module.exports = (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      logger.warn("Socket auth failed: no token provided", {
        socketId: socket.id,
        ip: socket.handshake.address,
      });
      return next(new Error("Authentication required: no token provided"));
    }

    // Verify the standard JWT issued by /api/socket-token
    const decoded = jwt.verify(token, config.jwt.secret, {
      issuer: "collabsync",
    });

    // Validate required fields exist in the decoded token
    if (!decoded._id || !decoded.companyId) {
      logger.warn("Socket auth failed: token missing required fields", {
        socketId: socket.id,
        hasId: !!decoded._id,
        hasCompanyId: !!decoded.companyId,
      });
      return next(
        new Error("Authentication failed: token missing required fields")
      );
    }

    // Attach structured user object to the socket
    socket.user = {
      _id: decoded._id,
      email: decoded.email || null,
      name: decoded.name || null,
      role: decoded.role || "employee",
      companyId: decoded.companyId,
      isVerified: decoded.isVerified || false,
    };

    logger.debug("Socket authenticated", {
      socketId: socket.id,
      userId: socket.user._id,
      role: socket.user.role,
    });

    next();
  } catch (error) {
    // Differentiate between expired tokens and other errors
    if (error.name === "TokenExpiredError") {
      logger.warn("Socket auth failed: token expired", {
        socketId: socket.id,
      });
      return next(new Error("Authentication failed: token expired"));
    }

    if (error.name === "JsonWebTokenError") {
      logger.warn("Socket auth failed: invalid token", {
        socketId: socket.id,
        error: error.message,
      });
      return next(new Error("Authentication failed: invalid token"));
    }

    logger.error("Socket auth unexpected error", {
      socketId: socket.id,
      error: error.message,
    });
    return next(new Error("Authentication failed"));
  }
};