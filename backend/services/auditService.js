const AuditEvent = require('../models/AuditEvent');
const logger = require('./logger');

async function record(event) {
  try {
    // Basic size guard for meta
    if (event.meta) {
      const json = JSON.stringify(event.meta);
      if (json.length > 4000) event.meta = { truncated: true };
    }
    const doc = await AuditEvent.create(event);
    logger.info({ msg: 'audit', type: event.type, actorId: event.actorId, resourceId: event.resourceId, requestId: event.requestId });
    return doc;
  } catch (e) {
    logger.error({ msg: 'audit_error', error: e.message });
  }
}

module.exports = { record };
