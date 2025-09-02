const mongoose = require('mongoose');

const caseNoteSchema = new mongoose.Schema({
  at: { type: Date, default: Date.now },
  by: { type: String },
  text: { type: String }
}, { _id: false });

const caseEntitySchema = new mongoose.Schema({
  // Accept both 'user' and shorthand 'uid' for consistency with graph types
  type: { type: String, enum: ['user','uid','vendor','device','ip','phone','order','email','address'], required: true },
  value: { type: String, required: true },
  meta: { type: Object }
}, { _id: false });

const caseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  status: { type: String, enum: ['open','investigating','resolved','closed'], default: 'open' },
  priority: { type: String, enum: ['low','medium','high','critical'], default: 'medium' },
  severityScore: { type: Number, default: 0 },
  entities: [caseEntitySchema],
  orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
  notes: [caseNoteSchema],
  tags: [{ type: String }],
  assignedTo: { type: String },
  createdBy: { type: String },
  updatedBy: { type: String }
}, { timestamps: true });

caseSchema.index({ status: 1, updatedAt: -1 });
caseSchema.index({ 'entities.type': 1, 'entities.value': 1 });

module.exports = mongoose.model('Case', caseSchema);
