const express = require('express');
const router = express.Router();
const Rule = require('../models/Rule');
const Order = require('../models/Order');
const User = require('../models/User');
const AuditEvent = require('../models/AuditEvent');
const { protect, adminOnly } = require('../middleware/auth');

// Get all automated rules
router.get('/rules', protect, adminOnly, async (req, res) => {
  try {
    const rules = await Rule.find({ status: { $ne: 'deleted' } })
      .sort({ priority: 1, createdAt: -1 });

    // Add statistics for each rule
    const rulesWithStats = await Promise.all(rules.map(async (rule) => {
      const ruleObj = rule.toObject();
      
      // Get trigger count from audit events
      const triggerCount = await AuditEvent.countDocuments({
        type: 'rule_triggered',
        'meta.ruleId': rule._id
      });

      // Calculate success rate (mock for now)
      const successRate = Math.floor(Math.random() * 30) + 70; // 70-100%

      // Get last triggered date
      const lastTrigger = await AuditEvent.findOne({
        type: 'rule_triggered',
        'meta.ruleId': rule._id
      }).sort({ createdAt: -1 });

      return {
        ...ruleObj,
        triggerCount,
        successRate,
        lastTriggered: lastTrigger?.createdAt
      };
    }));

    res.json({ rules: rulesWithStats });
  } catch (error) {
    console.error('Error fetching rules:', error);
    res.status(500).json({ error: 'Failed to fetch rules' });
  }
});

// Create new rule
router.post('/rules', protect, adminOnly, async (req, res) => {
  try {
    const {
      name,
      description,
      triggers = [],
      conditions = [],
      actions = [],
      enabled = true,
      priority = 'medium'
    } = req.body;

    const rule = new Rule({
      name,
      description,
      triggers,
      conditions,
      actions,
      enabled,
      priority,
      createdBy: req.user.id,
      updatedBy: req.user.id
    });

    await rule.save();

    // Log rule creation
    await AuditEvent.create({
      type: 'rule_created',
      userId: req.user.id,
      description: `Created rule: ${name}`,
      meta: { ruleId: rule._id, ruleName: name }
    });

    res.json({
      success: true,
      rule
    });
  } catch (error) {
    console.error('Error creating rule:', error);
    res.status(500).json({ error: 'Failed to create rule' });
  }
});

// Toggle rule enabled/disabled
router.patch('/rules/:ruleId/toggle', protect, adminOnly, async (req, res) => {
  try {
    const { ruleId } = req.params;
    const { enabled } = req.body;

    const rule = await Rule.findById(ruleId);
    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    rule.enabled = enabled;
    rule.updatedBy = req.user.id;
    await rule.save();

    // Log rule toggle
    await AuditEvent.create({
      type: 'rule_toggled',
      userId: req.user.id,
      description: `${enabled ? 'Enabled' : 'Disabled'} rule: ${rule.name}`,
      meta: { ruleId: rule._id, enabled }
    });

    res.json({
      success: true,
      message: `Rule ${enabled ? 'enabled' : 'disabled'} successfully`
    });
  } catch (error) {
    console.error('Error toggling rule:', error);
    res.status(500).json({ error: 'Failed to toggle rule' });
  }
});

// Get automated responses history
router.get('/automated-responses', protect, adminOnly, async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const responses = await AuditEvent.find({
      type: { $in: ['automated_response', 'rule_triggered', 'auto_action_taken'] }
    })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

    // Format responses for display
    const formattedResponses = responses.map(event => ({
      timestamp: event.createdAt,
      ruleName: event.meta?.ruleName || 'Unknown Rule',
      trigger: event.meta?.trigger || event.description,
      action: {
        type: event.meta?.actionType || 'unknown'
      },
      targetType: event.meta?.targetType || 'unknown',
      targetId: event.meta?.targetId || 'unknown',
      status: event.meta?.status || 'success'
    }));

    res.json({
      responses: formattedResponses
    });
  } catch (error) {
    console.error('Error fetching automated responses:', error);
    res.status(500).json({ error: 'Failed to fetch automated responses' });
  }
});

// Execute rule action (manual trigger)
router.post('/rules/:ruleId/execute', protect, adminOnly, async (req, res) => {
  try {
    const { ruleId } = req.params;
    const { targetId, targetType, reason } = req.body;

    const rule = await Rule.findById(ruleId);
    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    if (!rule.enabled) {
      return res.status(400).json({ error: 'Rule is disabled' });
    }

    // Execute rule actions
    const results = [];
    for (const action of rule.actions) {
      try {
        const result = await executeAction(action, targetId, targetType, req.user.id);
        results.push(result);
      } catch (actionError) {
        console.error('Action execution failed:', actionError);
        results.push({
          action: action.type,
          status: 'failed',
          error: actionError.message
        });
      }
    }

    // Log manual rule execution
    await AuditEvent.create({
      type: 'rule_manually_executed',
      userId: req.user.id,
      description: `Manually executed rule: ${rule.name}`,
      meta: {
        ruleId: rule._id,
        targetId,
        targetType,
        reason,
        results
      }
    });

    res.json({
      success: true,
      message: 'Rule executed successfully',
      results
    });
  } catch (error) {
    console.error('Error executing rule:', error);
    res.status(500).json({ error: 'Failed to execute rule' });
  }
});

// Helper function to execute actions
async function executeAction(action, targetId, targetType, adminId) {
  switch (action.type) {
    case 'block_user':
      if (targetType === 'user') {
        await User.findByIdAndUpdate(targetId, {
          banned: true,
          bannedBy: adminId,
          bannedAt: new Date(),
          bannedReason: 'Automated rule action'
        });
        return { action: 'block_user', status: 'success', target: targetId };
      }
      break;

    case 'flag_order':
      if (targetType === 'order') {
        await Order.findByIdAndUpdate(targetId, {
          requiresApproval: true,
          'adminApproval.status': 'pending',
          $push: {
            suspiciousFlags: {
              type: 'automated_rule',
              description: 'Flagged by automated rule',
              severity: 'high',
              flaggedAt: new Date()
            }
          }
        });
        return { action: 'flag_order', status: 'success', target: targetId };
      }
      break;

    case 'require_verification':
      if (targetType === 'user') {
        await User.findByIdAndUpdate(targetId, {
          'verification.status': 'required',
          'verification.requiredAt': new Date()
        });
        return { action: 'require_verification', status: 'success', target: targetId };
      }
      break;

    case 'notify_admin':
      // Create notification or alert
      await AuditEvent.create({
        type: 'admin_notification',
        description: `Automated alert: ${action.message || 'Rule triggered'}`,
        meta: { targetId, targetType, automated: true }
      });
      return { action: 'notify_admin', status: 'success', target: targetId };

    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }

  throw new Error(`Action ${action.type} not applicable to ${targetType}`);
}

// Rule testing endpoint
router.post('/rules/test', protect, adminOnly, async (req, res) => {
  try {
    const { ruleId, testData } = req.body;

    const rule = await Rule.findById(ruleId);
    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    // Simulate rule evaluation
    const evaluation = {
      triggered: Math.random() > 0.5, // Simplified evaluation
      matchedConditions: rule.conditions.slice(0, Math.floor(Math.random() * rule.conditions.length) + 1),
      actionsToTake: rule.actions,
      riskScore: Math.floor(Math.random() * 100)
    };

    res.json({
      success: true,
      evaluation,
      testData
    });
  } catch (error) {
    console.error('Error testing rule:', error);
    res.status(500).json({ error: 'Failed to test rule' });
  }
});

module.exports = router;
