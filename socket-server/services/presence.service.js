/**
 * CollabSync Socket Server — Presence Service
 *
 * Database operations for user presence: online/offline status,
 * lastActive tracking, and online user queries.
 *
 * This is the service layer — no socket emit logic here.
 */

const User = require("../models/User");
const logger = require("../utils/logger");

/**
 * Mark a user as online in the database.
 * @param {string} userId
 * @returns {Promise<boolean>} true on success
 */
async function setOnline(userId) {
  try {
    await User.findByIdAndUpdate(userId, {
      isOnline: true,
      lastActive: new Date(),
    });

    logger.debug("User marked online", { userId });
    return true;
  } catch (error) {
    logger.error("Error setting user online", {
      userId,
      error: error.message,
    });
    return false;
  }
}

/**
 * Mark a user as offline and update lastActive timestamp.
 * @param {string} userId
 * @returns {Promise<boolean>} true on success
 */
async function setOffline(userId) {
  try {
    await User.findByIdAndUpdate(userId, {
      isOnline: false,
      lastActive: new Date(),
    });

    logger.debug("User marked offline", { userId });
    return true;
  } catch (error) {
    logger.error("Error setting user offline", {
      userId,
      error: error.message,
    });
    return false;
  }
}

/**
 * Get all currently online users for a company.
 * @param {string} companyId
 * @returns {Promise<Array<{ _id: string, name: string, avatarUrl?: string }>>}
 */
async function getOnlineUsers(companyId) {
  try {
    const users = await User.find(
      { companyId, isOnline: true },
      { _id: 1, name: 1, avatarUrl: 1, role: 1, lastActive: 1 }
    ).lean();

    return users;
  } catch (error) {
    logger.error("Error fetching online users", {
      companyId,
      error: error.message,
    });
    return [];
  }
}

/**
 * Get user info needed for presence broadcasts.
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
async function getUserPresenceInfo(userId) {
  try {
    return await User.findById(userId, {
      _id: 1,
      name: 1,
      avatarUrl: 1,
      companyId: 1,
      role: 1,
    }).lean();
  } catch (error) {
    logger.error("Error fetching user presence info", {
      userId,
      error: error.message,
    });
    return null;
  }
}

module.exports = {
  setOnline,
  setOffline,
  getOnlineUsers,
  getUserPresenceInfo,
};
