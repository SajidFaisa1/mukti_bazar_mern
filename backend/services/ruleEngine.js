const Rule = require('../models/Rule');

// Evaluate rules against a context (order + derived fields) returning cumulative effects
async function evaluateRules(context) {
  const rules = await Rule.find({ enabled: true }).sort({ priority: 1 }).lean();
  const applied = [];
  let extraRisk = 0;
  const addedReasons = new Set();
  const addedFlags = [];
  let requireApproval = false;

  const now = Date.now();
  for (const r of rules) {
    if (r.status && r.status !== 'active') {
      // handle scheduled
      if (r.status === 'scheduled') {
        if (r.effectiveFrom && r.effectiveFrom.getTime() > now) continue;
        if (r.effectiveTo && r.effectiveTo.getTime() < now) continue;
      } else if (r.status !== 'draft') continue;
    }
    if (!r.conditions || r.conditions.length === 0) continue;
    const match = r.conditions.every(c => testCondition(c, context));
    if (!match) continue;
    applied.push(r.name);
    if (r.actions?.addRisk) extraRisk += r.actions.addRisk;
    if (r.actions?.addReason) addedReasons.add(r.actions.addReason);
    if (r.actions?.requireApproval) requireApproval = true;
    if (r.actions?.addFlag?.type) {
      addedFlags.push({
        type: r.actions.addFlag.type,
        severity: r.actions.addFlag.severity || 'medium',
        description: r.actions.addFlag.description || r.name,
        flaggedAt: new Date()
      });
    }
  }

  return { applied, extraRisk, addedReasons: Array.from(addedReasons), addedFlags, requireApproval };
}

function testCondition(cond, ctx) {
  const { field, op, value } = cond;
  const v = getByPath(ctx, field);
  switch (op) {
    case 'exists': return v !== undefined && v !== null;
    case 'gt': return Number(v) > Number(value);
    case 'gte': return Number(v) >= Number(value);
    case 'lt': return Number(v) < Number(value);
    case 'lte': return Number(v) <= Number(value);
    case 'eq': return v === value;
    case 'neq': return v !== value;
    case 'includes': return Array.isArray(v) && v.includes(value);
    default: return false;
  }
}

// Evaluate nested tree structure: { logic:'AND'|'OR', nodes:[ condition|tree ] }
function evaluateTree(node, ctx) {
  if (!node) return true;
  if (node.field) return testCondition(node, ctx);
  const logic = (node.logic || 'AND').toUpperCase();
  const nodes = node.nodes || [];
  if (logic === 'AND') return nodes.every(n => evaluateTree(n, ctx));
  if (logic === 'OR') return nodes.some(n => evaluateTree(n, ctx));
  return false;
}

function getByPath(obj, path) {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

module.exports = { evaluateRules };