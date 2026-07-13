/**
 * CollabSync Socket Server — Company Emitter
 *
 * Broadcasts company-wide events to company rooms.
 * Called from REST API controllers after company operations.
 */

const { emitToCompany } = require("../utils/emit");
const EVENTS = require("../types/socket-events");
const logger = require("../utils/logger");

/**
 * Broadcast a company settings/profile update.
 * @param {string} companyId
 * @param {object} data - Updated company data
 */
function update(companyId, data) {
  logger.debug("CompanyEmitter → update", { companyId });

  emitToCompany(companyId, EVENTS.COMPANY_UPDATE, {
    company: data,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Broadcast a company-wide announcement.
 * @param {string} companyId
 * @param {object} data
 * @param {string} data.title
 * @param {string} data.body
 * @param {object} data.author - { _id, name }
 */
function announcement(companyId, data) {
  logger.debug("CompanyEmitter → announcement", { companyId });

  emitToCompany(companyId, EVENTS.COMPANY_ANNOUNCEMENT, {
    title: data.title,
    body: data.body,
    author: data.author,
    timestamp: new Date().toISOString(),
  });
}

module.exports = { update, announcement };
