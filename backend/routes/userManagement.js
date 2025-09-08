const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Order = require('../models/Order');
const AuditEvent = require('../models/AuditEvent');
const { protect, adminOnly } = require('../middleware/auth');

// Get users for bulk management
router.get('/bulk-management', protect, adminOnly, async (req, res) => {
  try {
    const { 
      status = 'all', 
      verification = 'all', 
      search = '', 
      riskLevel = 'all',
      limit = 100,
      page = 1
    } = req.query;

    // Build filter
    let filter = {};

    if (status !== 'all') {
      if (status === 'banned') {
        filter.banned = true;
      } else if (status === 'active') {
        filter.banned = { $ne: true };
      } else if (status === 'suspended') {
        filter.suspended = true;
      }
    }

    if (verification !== 'all') {
      filter['verification.status'] = verification;
    }

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { uid: { $regex: search, $options: 'i' } }
      ];
    }

    // Get users with aggregated risk data
    const users = await User.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'orders',
          localField: 'uid',
          foreignField: 'uid',
          as: 'orders'
        }
      },
      {
        $addFields: {
          orderCount: { $size: '$orders' },
          suspiciousOrderCount: {
            $size: {
              $filter: {
                input: '$orders',
                cond: { $eq: ['$$this.requiresApproval', true] }
              }
            }
          },
          avgRiskScore: {
            $avg: {
              $map: {
                input: '$orders',
                as: 'order',
                in: '$$order.securityInfo.riskScore'
              }
            }
          }
        }
      },
      {
        $addFields: {
          riskLevel: {
            $switch: {
              branches: [
                { 
                  case: { 
                    $or: [
                      { $gte: ['$avgRiskScore', 75] },
                      { $gte: [{ $divide: ['$suspiciousOrderCount', { $max: ['$orderCount', 1] }] }, 0.5] }
                    ]
                  }, 
                  then: 'critical' 
                },
                { 
                  case: { 
                    $or: [
                      { $gte: ['$avgRiskScore', 50] },
                      { $gte: [{ $divide: ['$suspiciousOrderCount', { $max: ['$orderCount', 1] }] }, 0.3] }
                    ]
                  }, 
                  then: 'high' 
                },
                { 
                  case: { 
                    $or: [
                      { $gte: ['$avgRiskScore', 25] },
                      { $gte: [{ $divide: ['$suspiciousOrderCount', { $max: ['$orderCount', 1] }] }, 0.1] }
                    ]
                  }, 
                  then: 'medium' 
                }
              ],
              default: 'low'
            }
          },
          status: {
            $cond: {
              if: '$banned',
              then: 'banned',
              else: {
                $cond: {
                  if: '$suspended',
                  then: 'suspended',
                  else: 'active'
                }
              }
            }
          }
        }
      },
      { $sort: { createdAt: -1 } },
      { $skip: (parseInt(page) - 1) * parseInt(limit) },
      { $limit: parseInt(limit) },
      {
        $project: {
          password: 0,
          orders: 0
        }
      }
    ]);

    // Filter by risk level if specified
    const filteredUsers = riskLevel !== 'all' 
      ? users.filter(user => user.riskLevel === riskLevel)
      : users;

    res.json({
      users: filteredUsers,
      pagination: {
        current: parseInt(page),
        total: filteredUsers.length
      }
    });

  } catch (error) {
    console.error('Error fetching users for bulk management:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Execute bulk action on users
router.post('/bulk-action', protect, adminOnly, async (req, res) => {
  try {
    const { userIds, action, reason } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'User IDs array is required' });
    }

    const results = [];
    let updateQuery = {};
    let actionDescription = '';

    // Define update based on action
    switch (action) {
      case 'ban':
        updateQuery = {
          banned: true,
          bannedBy: req.user.id,
          bannedAt: new Date(),
          bannedReason: reason || 'Bulk administrative action'
        };
        actionDescription = 'banned';
        break;

      case 'unban':
        updateQuery = {
          banned: false,
          $unset: { bannedBy: '', bannedAt: '', bannedReason: '' }
        };
        actionDescription = 'unbanned';
        break;

      case 'suspend':
        updateQuery = {
          suspended: true,
          suspendedBy: req.user.id,
          suspendedAt: new Date(),
          suspendedReason: reason || 'Bulk administrative action'
        };
        actionDescription = 'suspended';
        break;

      case 'activate':
        updateQuery = {
          suspended: false,
          banned: false,
          $unset: { 
            suspendedBy: '', 
            suspendedAt: '', 
            suspendedReason: '',
            bannedBy: '', 
            bannedAt: '', 
            bannedReason: '' 
          }
        };
        actionDescription = 'activated';
        break;

      case 'require_verification':
        updateQuery = {
          'verification.status': 'required',
          'verification.requiredAt': new Date(),
          'verification.requiredBy': req.user.id
        };
        actionDescription = 'required verification';
        break;

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    // Execute bulk update
    const bulkResult = await User.updateMany(
      { _id: { $in: userIds } },
      updateQuery
    );

    // Log individual actions for audit
    for (const userId of userIds) {
      try {
        const user = await User.findById(userId).select('firstName lastName email');
        if (user) {
          await AuditEvent.create({
            type: 'bulk_user_action',
            userId: req.user.id,
            description: `User ${user.firstName} ${user.lastName} (${user.email}) was ${actionDescription}`,
            meta: {
              action,
              targetUserId: userId,
              reason,
              bulkAction: true
            }
          });

          results.push({
            userId,
            status: 'success',
            user: `${user.firstName} ${user.lastName}`
          });
        }
      } catch (error) {
        results.push({
          userId,
          status: 'error',
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Bulk ${action} completed`,
      modifiedCount: bulkResult.modifiedCount,
      results,
      summary: {
        total: userIds.length,
        successful: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'error').length
      }
    });

  } catch (error) {
    console.error('Error executing bulk action:', error);
    res.status(500).json({ error: 'Failed to execute bulk action' });
  }
});

// Get user behavior analysis
router.get('/:userId/behavior-analysis', protect, adminOnly, async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    // Get user's order patterns
    const orderAnalysis = await Order.aggregate([
      {
        $match: {
          uid: user.uid,
          orderedAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            hour: { $hour: '$orderedAt' },
            dayOfWeek: { $dayOfWeek: '$orderedAt' }
          },
          count: { $sum: 1 },
          avgTotal: { $avg: '$total' },
          suspiciousCount: {
            $sum: { $cond: ['$requiresApproval', 1, 0] }
          }
        }
      }
    ]);

    // Get device/IP patterns
    const deviceAnalysis = await Order.aggregate([
      {
        $match: {
          uid: user.uid,
          orderedAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            ip: '$securityInfo.ipAddress',
            device: '$securityInfo.deviceFingerprint'
          },
          count: { $sum: 1 },
          lastUsed: { $max: '$orderedAt' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Calculate risk indicators
    const totalOrders = await Order.countDocuments({
      uid: user.uid,
      orderedAt: { $gte: startDate }
    });

    const suspiciousOrders = await Order.countDocuments({
      uid: user.uid,
      orderedAt: { $gte: startDate },
      requiresApproval: true
    });

    const avgRiskScore = await Order.aggregate([
      {
        $match: {
          uid: user.uid,
          orderedAt: { $gte: startDate },
          'securityInfo.riskScore': { $exists: true }
        }
      },
      {
        $group: {
          _id: null,
          avgRisk: { $avg: '$securityInfo.riskScore' }
        }
      }
    ]);

    const behaviorAnalysis = {
      orderPatterns: orderAnalysis,
      devicePatterns: deviceAnalysis,
      summary: {
        totalOrders,
        suspiciousOrders,
        suspiciousRatio: totalOrders ? (suspiciousOrders / totalOrders) : 0,
        avgRiskScore: avgRiskScore[0]?.avgRisk || 0,
        uniqueIPs: deviceAnalysis.filter(d => d._id.ip).length,
        uniqueDevices: deviceAnalysis.filter(d => d._id.device).length
      }
    };

    res.json({
      user: {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        uid: user.uid
      },
      analysis: behaviorAnalysis
    });

  } catch (error) {
    console.error('Error analyzing user behavior:', error);
    res.status(500).json({ error: 'Failed to analyze user behavior' });
  }
});

// Account linking detection
router.get('/account-linking', protect, adminOnly, async (req, res) => {
  try {
    const { threshold = 3 } = req.query;

    // Find users sharing devices or IPs
    const linkageAnalysis = await Order.aggregate([
      {
        $match: {
          $or: [
            { 'securityInfo.deviceFingerprint': { $exists: true, $ne: null } },
            { 'securityInfo.ipAddress': { $exists: true, $ne: null } }
          ]
        }
      },
      {
        $group: {
          _id: {
            device: '$securityInfo.deviceFingerprint',
            ip: '$securityInfo.ipAddress'
          },
          users: { $addToSet: '$uid' },
          orderCount: { $sum: 1 },
          orders: { $push: '$_id' }
        }
      },
      {
        $addFields: {
          userCount: { $size: '$users' }
        }
      },
      {
        $match: {
          userCount: { $gte: parseInt(threshold) }
        }
      },
      {
        $sort: { userCount: -1 }
      },
      {
        $limit: 50
      }
    ]);

    // Enrich with user details
    const enrichedLinkage = await Promise.all(
      linkageAnalysis.map(async (link) => {
        const userDetails = await User.find({
          uid: { $in: link.users }
        }).select('uid firstName lastName email createdAt');

        return {
          ...link,
          userDetails,
          riskLevel: link.userCount >= 10 ? 'critical' : 
                    link.userCount >= 5 ? 'high' : 'medium'
        };
      })
    );

    res.json({
      linkages: enrichedLinkage,
      summary: {
        totalGroups: enrichedLinkage.length,
        criticalGroups: enrichedLinkage.filter(l => l.riskLevel === 'critical').length,
        totalUsersInvolved: enrichedLinkage.reduce((sum, l) => sum + l.userCount, 0)
      }
    });

  } catch (error) {
    console.error('Error detecting account linking:', error);
    res.status(500).json({ error: 'Failed to detect account linking' });
  }
});

module.exports = router;
