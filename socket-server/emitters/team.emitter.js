/**
 * CollabSync Socket Server — Team Emitter
 *
 * Broadcasts team events to team rooms.
 * Called from REST API controllers after team operations.
 */

const { emitToTeam, emitToUser } = require("../utils/emit");
const EVENTS = require("../types/socket-events");
const notificationService = require("../services/notification.service");
const notificationEmitter = require("./notification.emitter");
const logger = require("../utils/logger");

/**
 * Broadcast a team settings/profile update.
 * @param {string} teamId
 * @param {object} data - Updated team data
 */
function update(teamId, data) {
  logger.debug("TeamEmitter → update", { teamId });

  emitToTeam(teamId, EVENTS.TEAM_UPDATE, {
    team: data,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Broadcast that a new member was added to a team.
 * Notifies the team and the added member.
 * @param {string} teamId
 * @param {object} data
 * @param {object} data.member - { _id, name, email }
 * @param {object} data.addedBy - { _id, name }
 * @param {string} data.teamName
 */
async function memberAdded(teamId, data) {
  logger.debug("TeamEmitter → memberAdded", {
    teamId,
    memberId: data.member._id,
  });

  // Notify the team
  emitToTeam(teamId, EVENTS.TEAM_MEMBER_ADDED, {
    member: data.member,
    addedBy: data.addedBy,
    timestamp: new Date().toISOString(),
  });

  // Create notification for the added member
  const notification = await notificationService.create({
    recipientId: data.member._id.toString(),
    type: "team_member_added",
    title: "Added to Team",
    body: `${data.addedBy.name} added you to "${data.teamName}"`,
    meta: {
      resourceType: "team",
      resourceId: teamId,
      actorId: data.addedBy._id,
      actorName: data.addedBy.name,
    },
  });

  if (notification) {
    notificationEmitter.send(data.member._id.toString(), notification);
  }
}

module.exports = { update, memberAdded };
