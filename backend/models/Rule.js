const mongoose = require('mongoose');

// Basic rule schema for fraud / approval management
// Conditions: simple AND of atomic predicates { field, op, value }
// Supported ops: gt,gte,lt,lte,eq,neq,includes,exists
// Actions: addRisk (number), requireApproval (bool), addReason (string), addFlag {type,severity,description}

const conditionSchema = new mongoose.Schema({
  field: { type: String, required: true },
  op: { type: String, enum: ['gt','gte','lt','lte','eq','neq','includes','exists'], required: true },
  value: { type: mongoose.Schema.Types.Mixed }
}, { _id: false });

const actionSchema = new mongoose.Schema({
  addRisk: { type: Number },
  requireApproval: { type: Boolean },
  addReason: { type: String },
  addFlag: {
    type: { type: String },
    severity: { type: String, enum: ['low','medium','high','critical'] },
    description: { type: String }
  }
}, { _id: false });

const auditEntrySchema = new mongoose.Schema({
  at: { type: Date, default: Date.now },
  by: { type: String },
  action: { type: String },
  meta: { type: Object }
}, { _id: false });

// Nested logical tree (advanced). Structure example:
// { logic: 'AND', nodes: [ { field:'total', op:'gt', value:50000 }, { logic:'OR', nodes:[ { field:'velocity.last1h', op:'gt', value:5 }, { field:'negotiated.deltaPct', op:'gt', value:40 } ] } ] }

const ruleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  enabled: { type: Boolean, default: true },
  priority: { type: Number, default: 100 },
  conditions: [conditionSchema], // legacy simple AND list
  tree: { type: Object }, // advanced nested logic
  actions: actionSchema,
  version: { type: Number, default: 1 },
  supersedes: { type: mongoose.Schema.Types.ObjectId, ref: 'Rule' },
  effectiveFrom: { type: Date },
  effectiveTo: { type: Date },
  status: { type: String, enum: ['draft','active','scheduled','expired','archived'], default: 'active' },
  auditHistory: [auditEntrySchema],
  createdBy: { type: String },
  updatedBy: { type: String }
}, { timestamps: true });

ruleSchema.index({ enabled: 1, priority: 1 });

module.exports = mongoose.model('Rule', ruleSchema);
