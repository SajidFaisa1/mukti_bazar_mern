const express = require('express');
const router = express.Router();
const AuditEvent = require('../models/AuditEvent');
const { protect, adminOnly } = require('../middleware/auth');

// GET /api/audit?type=login_success&limit=50
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const { type, actorId, resourceId, resourceType, limit = 50 } = req.query;
    const q = {};
    if (type) q.type = type;
    if (actorId) q.actorId = actorId;
    if (resourceId) q.resourceId = resourceId;
    if (resourceType) q.resourceType = resourceType;
    const items = await AuditEvent.find(q).sort({ createdAt: -1 }).limit(Math.min(parseInt(limit), 200));
    res.json({ success: true, events: items });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch audit events' });
  }
});

module.exports = router;
