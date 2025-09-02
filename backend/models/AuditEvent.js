const mongoose = require('mongoose');

const auditEventSchema = new mongoose.Schema({
  type: { type: String, required: true }, // e.g. order_created, login_success, login_failed
  actorId: { type: String }, // user/vendor/admin id or uid
  actorRole: { type: String },
  ip: { type: String },
  requestId: { type: String },
  resourceType: { type: String }, // Order, Product, User
  resourceId: { type: String },
  meta: { type: Object }, // arbitrary small metadata
  createdAt: { type: Date, default: Date.now }
}, { versionKey: false });

auditEventSchema.index({ type: 1, createdAt: -1 });
auditEventSchema.index({ actorId: 1, createdAt: -1 });
auditEventSchema.index({ resourceType: 1, resourceId: 1 });

module.exports = mongoose.model('AuditEvent', auditEventSchema);
