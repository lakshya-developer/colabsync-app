/**
 * CollabSync Socket Server — Notification Service
 *
 * Database operations for notifications: creation, read marking,
 * and querying. Used by emitters and handlers.
 *
 * This is the service layer — no socket emit logic here.
 */

const Notification = require("../models/Notification");
const logger = require("../utils/logger");

/**
 * Create a new notification in the database.
 * @param {object} data
 * @param {string} data.recipientId - User who receives the notification
 * @param {string} data.type - Notification type enum
 * @param {string} data.title - Short title
 * @param {string} [data.body] - Description body
 * @param {object} [data.meta] - Resource linking metadata
 * @param {string} [data.meta.resourceType]
 * @param {string} [data.meta.resourceId]
 * @param {string} [data.meta.actorId] - Who triggered this
 * @param {string} [data.meta.actorName]
 * @returns {Promise<object|null>} The saved notification, or null on failure
 */
async function create(data) {
  try {
    const notification = new Notification({
      recipientId: data.recipientId,
      type: data.type,
      title: data.title,
      body: data.body || "",
      meta: data.meta || {},
      createdAt: new Date(),
    });

    const saved = await notification.save();

    logger.debug("Notification created", {
      notificationId: saved._id.toString(),
      recipientId: data.recipientId,
      type: data.type,
    });

    return saved.toObject();
  } catch (error) {
    logger.error("Error creating notification", {
      recipientId: data.recipientId,
      type: data.type,
      error: error.message,
    });
    return null;
  }
}

/**
 * Mark a notification as read.
 * Validates the notification belongs to the requesting user.
 * @param {string} notificationId
 * @param {string} userId
 * @returns {Promise<{ success: boolean, notification?: object }>}
 */
async function markAsRead(notificationId, userId) {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        recipientId: userId,
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      },
      { new: true }
    ).lean();

    if (!notification) {
      return { success: false };
    }

    logger.debug("Notification marked as read", {
      notificationId,
      userId,
    });

    return { success: true, notification };
  } catch (error) {
    logger.error("Error marking notification as read", {
      notificationId,
      userId,
      error: error.message,
    });
    return { success: false };
  }
}

/**
 * Get unread notification count for a user.
 * @param {string} userId
 * @returns {Promise<number>}
 */
async function getUnreadCount(userId) {
  try {
    return await Notification.countDocuments({
      recipientId: userId,
      isRead: false,
    });
  } catch (error) {
    logger.error("Error fetching unread count", {
      userId,
      error: error.message,
    });
    return 0;
  }
}

module.exports = {
  create,
  markAsRead,
  getUnreadCount,
};
