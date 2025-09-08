const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const AuditEvent = require('../models/AuditEvent');
const mongoose = require('mongoose');

// Advanced user search and filtering
router.get('/users/advanced', async (req, res) => {
  try {
    const {
      search = '',
      status = 'all',
      riskLevel = 'all',
      verificationStatus = 'all',
      accountAge = 'all',
      limit = 100,
      page = 1
    } = req.query;

    // Build query
    let query = {};
    
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    if (status !== 'all') {
      query.status = status;
    }

    if (riskLevel !== 'all') {
      query.riskLevel = riskLevel;
    }

    if (verificationStatus !== 'all') {
      query['verification.status'] = verificationStatus;
    }

    if (accountAge !== 'all') {
      const now = new Date();
      let dateThreshold;
      
      switch (accountAge) {
        case 'new':
          dateThreshold = new Date(now.setDate(now.getDate() - 30));
          query.createdAt = { $gte: dateThreshold };
          break;
        case 'old':
          dateThreshold = new Date(now.setFullYear(now.getFullYear() - 1));
          query.createdAt = { $lt: dateThreshold };
          break;
      }
    }

    const users = await User.find(query)
      .select('-password')
      .populate('verification')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await User.countDocuments(query);

    // Add risk assessment and behavior flags
    const enrichedUsers = users.map(user => ({
      ...user.toObject(),
      riskLevel: calculateUserRiskLevel(user),
      behaviorFlags: getUserBehaviorFlags(user),
      lastActivity: user.lastLoginAt || user.updatedAt
    }));

    res.json({
      users: enrichedUsers,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });

  } catch (error) {
    console.error('Error fetching advanced users:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// Get linked/duplicate accounts
router.get('/users/linked-accounts', async (req, res) => {
  try {
    // Find users with same phone, email patterns, or similar profile data
    const linkedAccounts = await User.aggregate([
      {
        $group: {
          _id: {
            $cond: [
              { $ne: ["$phone", null] },
              "$phone",
              "$email"
            ]
          },
          users: { $push: { id: "$_id", email: "$email", firstName: "$firstName", lastName: "$lastName" } },
          count: { $sum: 1 }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      },
      {
        $limit: 50
      }
    ]);

    res.json({ linkedAccounts });

  } catch (error) {
    console.error('Error finding linked accounts:', error);
    res.status(500).json({ message: 'Error analyzing linked accounts' });
  }
});

// Get user behavior analysis
router.get('/users/behavior-analysis', async (req, res) => {
  try {
    // This would integrate with your fraud detection system
    // For now, return mock behavior data
    const behaviorData = {
      suspiciousPatterns: [
        {
          type: 'rapid_account_creation',
          count: 15,
          timeframe: '24h',
          riskLevel: 'high'
        },
        {
          type: 'bulk_product_listings',
          count: 8,
          timeframe: '1h',
          riskLevel: 'medium'
        }
      ],
      anomalousActivities: [
        {
          userId: '507f1f77bcf86cd799439011',
          activity: 'login_from_new_location',
          riskScore: 0.8,
          timestamp: new Date()
        }
      ]
    };

    res.json({ behaviorData });

  } catch (error) {
    console.error('Error analyzing behavior:', error);
    res.status(500).json({ message: 'Error analyzing user behavior' });
  }
});

// Bulk user actions
router.post('/users/bulk-action', async (req, res) => {
  try {
    const { action, userIds } = req.body;

    if (!action || !userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ message: 'Invalid action or user IDs' });
    }

    let updateQuery = {};
    let auditAction = '';

    switch (action) {
      case 'ban':
        updateQuery = { 
          status: 'banned', 
          bannedAt: new Date(),
          bannedBy: req.user.id 
        };
        auditAction = 'BULK_BAN_USERS';
        break;
      case 'unban':
        updateQuery = { 
          status: 'active',
          $unset: { bannedAt: 1, bannedBy: 1 }
        };
        auditAction = 'BULK_UNBAN_USERS';
        break;
      case 'verify':
        updateQuery = { 
          'verification.status': 'verified',
          'verification.verifiedAt': new Date(),
          'verification.verifiedBy': req.user.id
        };
        auditAction = 'BULK_VERIFY_USERS';
        break;
      case 'flag':
        updateQuery = { 
          status: 'flagged',
          flaggedAt: new Date(),
          flaggedBy: req.user.id,
          flagReason: 'Bulk admin action'
        };
        auditAction = 'BULK_FLAG_USERS';
        break;
      default:
        return res.status(400).json({ message: 'Invalid action' });
    }

    const result = await User.updateMany(
      { _id: { $in: userIds } },
      updateQuery
    );

    // Log audit event
    await AuditEvent.create({
      adminId: req.user.id,
      action: auditAction,
      targetType: 'USER',
      targetIds: userIds,
      details: {
        action,
        affectedCount: result.modifiedCount
      }
    });

    res.json({
      message: `Bulk action completed successfully`,
      affectedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('Error performing bulk action:', error);
    res.status(500).json({ message: 'Error performing bulk action' });
  }
});

// Ban specific user
router.post('/users/:userId/ban', async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        status: 'banned',
        bannedAt: new Date(),
        bannedBy: req.user.id,
        banReason: reason
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Log audit event
    await AuditEvent.create({
      adminId: req.user.id,
      action: 'BAN_USER',
      targetType: 'USER',
      targetIds: [userId],
      details: { reason }
    });

    res.json({ message: 'User banned successfully', user });

  } catch (error) {
    console.error('Error banning user:', error);
    res.status(500).json({ message: 'Error banning user' });
  }
});

// Unban specific user
router.post('/users/:userId/unban', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        status: 'active',
        $unset: { bannedAt: 1, bannedBy: 1, banReason: 1 }
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Log audit event
    await AuditEvent.create({
      adminId: req.user.id,
      action: 'UNBAN_USER',
      targetType: 'USER',
      targetIds: [userId]
    });

    res.json({ message: 'User unbanned successfully', user });

  } catch (error) {
    console.error('Error unbanning user:', error);
    res.status(500).json({ message: 'Error unbanning user' });
  }
});

// Start user investigation
router.post('/users/:userId/investigate', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        investigationStatus: 'under_investigation',
        investigationStartedAt: new Date(),
        investigationStartedBy: req.user.id
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Log audit event
    await AuditEvent.create({
      adminId: req.user.id,
      action: 'START_USER_INVESTIGATION',
      targetType: 'USER',
      targetIds: [userId]
    });

    res.json({ message: 'Investigation started', user });

  } catch (error) {
    console.error('Error starting investigation:', error);
    res.status(500).json({ message: 'Error starting investigation' });
  }
});

// Helper functions
function calculateUserRiskLevel(user) {
  let riskScore = 0;
  
  // Account age factor
  const accountAge = (new Date() - user.createdAt) / (1000 * 60 * 60 * 24); // days
  if (accountAge < 7) riskScore += 0.3;
  else if (accountAge < 30) riskScore += 0.1;
  
  // Verification status
  if (!user.verification || user.verification.status !== 'verified') {
    riskScore += 0.4;
  }
  
  // Previous bans or flags
  if (user.status === 'banned' || user.status === 'flagged') {
    riskScore += 0.5;
  }
  
  // Activity patterns (would be enhanced with real data)
  if (!user.lastLoginAt) {
    riskScore += 0.2;
  }
  
  if (riskScore >= 0.7) return 'high';
  if (riskScore >= 0.4) return 'medium';
  return 'low';
}

function getUserBehaviorFlags(user) {
  const flags = [];
  
  // Check for suspicious patterns
  const accountAge = (new Date() - user.createdAt) / (1000 * 60 * 60 * 24);
  if (accountAge < 1) flags.push('new_account');
  
  if (!user.verification || user.verification.status !== 'verified') {
    flags.push('unverified');
  }
  
  if (!user.lastLoginAt) {
    flags.push('inactive');
  }
  
  return flags;
}

module.exports = router;
