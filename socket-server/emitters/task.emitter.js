/**
 * CollabSync Socket Server — Task Emitter
 *
 * Broadcasts task events to relevant rooms.
 * Called from REST API controllers after task operations succeed.
 *
 * Flow: REST → TaskService → DB → TaskEmitter → Socket Rooms
 */

const { emitToTeam, emitToUser } = require("../utils/emit");
const EVENTS = require("../types/socket-events");
const notificationService = require("../services/notification.service");
const notificationEmitter = require("./notification.emitter");
const logger = require("../utils/logger");

/**
 * Broadcast that a new task was created.
 * Emits to the team room so all team members see it.
 * @param {object} task - The created task object
 */
function created(task) {
  logger.debug("TaskEmitter → created", { taskId: task._id });

  if (task.teamId) {
    emitToTeam(task.teamId.toString(), EVENTS.TASK_CREATED, {
      task,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Broadcast that a task was updated.
 * Emits to the team + the assigned user.
 * @param {object} task - The updated task object
 * @param {object} [changes] - What fields changed
 */
function updated(task, changes) {
  logger.debug("TaskEmitter → updated", { taskId: task._id });

  if (task.teamId) {
    emitToTeam(task.teamId.toString(), EVENTS.TASK_UPDATED, {
      task,
      changes,
      timestamp: new Date().toISOString(),
    });
  }

  if (task.assignedId) {
    emitToUser(task.assignedId.toString(), EVENTS.TASK_UPDATED, {
      task,
      changes,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Broadcast that a task was assigned to a user.
 * Creates a notification and emits to the assigned user + team.
 * @param {object} task - The task object
 * @param {object} actor - Who assigned the task { _id, name }
 */
async function assigned(task, actor) {
  logger.debug("TaskEmitter → assigned", {
    taskId: task._id,
    assignedTo: task.assignedId,
  });

  const assignedUserId = task.assignedId.toString();

  // Emit real-time task event
  emitToUser(assignedUserId, EVENTS.TASK_ASSIGNED, {
    task,
    assignedBy: actor,
    timestamp: new Date().toISOString(),
  });

  if (task.teamId) {
    emitToTeam(task.teamId.toString(), EVENTS.TASK_ASSIGNED, {
      task,
      assignedBy: actor,
      timestamp: new Date().toISOString(),
    });
  }

  // Create and emit notification
  const notification = await notificationService.create({
    recipientId: assignedUserId,
    type: "task_assigned",
    title: "New Task Assigned",
    body: `${actor.name} assigned you "${task.title}"`,
    meta: {
      resourceType: "task",
      resourceId: task._id,
      actorId: actor._id,
      actorName: actor.name,
    },
  });

  if (notification) {
    notificationEmitter.send(assignedUserId, notification);
  }
}

/**
 * Broadcast that a task was completed.
 * @param {object} task - The completed task object
 * @param {object} actor - Who completed the task { _id, name }
 */
async function completed(task, actor) {
  logger.debug("TaskEmitter → completed", { taskId: task._id });

  if (task.teamId) {
    emitToTeam(task.teamId.toString(), EVENTS.TASK_COMPLETED, {
      task,
      completedBy: actor,
      timestamp: new Date().toISOString(),
    });
  }

  // Notify the task creator that their task was completed
  if (task.creatorId && task.creatorId.toString() !== actor._id.toString()) {
    const notification = await notificationService.create({
      recipientId: task.creatorId.toString(),
      type: "task_completed",
      title: "Task Completed",
      body: `${actor.name} completed "${task.title}"`,
      meta: {
        resourceType: "task",
        resourceId: task._id,
        actorId: actor._id,
        actorName: actor.name,
      },
    });

    if (notification) {
      notificationEmitter.send(task.creatorId.toString(), notification);
    }
  }
}

module.exports = { created, updated, assigned, completed };
