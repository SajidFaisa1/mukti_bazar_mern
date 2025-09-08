const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const AuditEvent = require('../models/AuditEvent');
const { protect, adminOnly } = require('../middleware/auth');

// Live Activities Endpoint
router.get('/live-activities', protect, adminOnly, async (req, res) => {
  try {
    const now = new Date();
    const last30Min = new Date(now.getTime() - 30 * 60 * 1000);
    
    // Get recent orders with fraud analysis
    const recentOrders = await Order.find({
      orderedAt: { $gte: last30Min }
    })
    .populate('user', 'firstName lastName')
    .populate('vendor', 'businessName')
    .sort({ orderedAt: -1 })
    .limit(50);

    // Get recent user registrations
    const recentUsers = await User.find({
      createdAt: { $gte: last30Min }
    })
    .sort({ createdAt: -1 })
    .limit(20);

    // Get recent vendor registrations
    const recentVendors = await Vendor.find({
      createdAt: { $gte: last30Min }
    })
    .sort({ createdAt: -1 })
    .limit(20);

    // Get system events
    const systemEvents = await AuditEvent.find({
      createdAt: { $gte: last30Min }
    })
    .sort({ createdAt: -1 })
    .limit(30);

    // Format activities
    const activities = [];

    // Add order activities
    recentOrders.forEach(order => {
      activities.push({
        type: order.requiresApproval ? 'fraud' : 'order',
        title: `Order ${order.orderNumber}`,
        description: `${order.user?.firstName || 'Unknown'} placed order for ৳${order.total}`,
        timestamp: order.orderedAt,
        userId: order.uid,
        riskScore: order.securityInfo?.riskScore,
        orderId: order._id
      });
    });

    // Add user activities
    recentUsers.forEach(user => {
      activities.push({
        type: 'user',
        title: 'New User Registration',
        description: `${user.firstName} ${user.lastName} registered`,
        timestamp: user.createdAt,
        userId: user._id
      });
    });

    // Add vendor activities
    recentVendors.forEach(vendor => {
      activities.push({
        type: 'vendor',
        title: 'New Vendor Application',
        description: `${vendor.businessName} applied for vendor status`,
        timestamp: vendor.createdAt,
        vendorId: vendor._id
      });
    });

    // Add system activities
    systemEvents.forEach(event => {
      activities.push({
        type: 'system',
        title: event.type.replace(/_/g, ' ').toUpperCase(),
        description: event.description || 'System event',
        timestamp: event.createdAt,
        eventId: event._id
      });
    });

    // Sort by timestamp and limit
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json({
      activities: activities.slice(0, 50)
    });

  } catch (error) {
    console.error('Error fetching live activities:', error);
    res.status(500).json({ error: 'Failed to fetch live activities' });
  }
});

// Live Alerts Endpoint
router.get('/live-alerts', protect, adminOnly, async (req, res) => {
  try {
    const now = new Date();
    const last1Hour = new Date(now.getTime() - 60 * 60 * 1000);
    
    const alerts = [];

    // High risk orders
    const highRiskOrders = await Order.find({
      orderedAt: { $gte: last1Hour },
      'securityInfo.riskScore': { $gte: 75 }
    });

    highRiskOrders.forEach(order => {
      alerts.push({
        severity: order.securityInfo.riskScore >= 90 ? 'critical' : 'high',
        title: 'High Risk Order Detected',
        description: `Order ${order.orderNumber} with risk score ${order.securityInfo.riskScore}`,
        timestamp: order.orderedAt,
        location: order.securityInfo?.ipAddress,
        orderId: order._id
      });
    });

    // Rapid ordering patterns
    const rapidOrderUsers = await Order.aggregate([
      {
        $match: {
          orderedAt: { $gte: last1Hour }
        }
      },
      {
        $group: {
          _id: '$uid',
          orderCount: { $sum: 1 },
          totalValue: { $sum: '$total' },
          orders: { $push: '$orderNumber' }
        }
      },
      {
        $match: {
          orderCount: { $gte: 5 }
        }
      }
    ]);

    rapidOrderUsers.forEach(user => {
      alerts.push({
        severity: user.orderCount >= 10 ? 'critical' : 'high',
        title: 'Rapid Ordering Pattern',
        description: `User ${user._id} placed ${user.orderCount} orders in 1 hour`,
        timestamp: now,
        userId: user._id
      });
    });

    // Bulk orders
    const bulkOrders = await Order.find({
      orderedAt: { $gte: last1Hour },
      'suspiciousFlags.type': 'bulk_hoarding'
    });

    bulkOrders.forEach(order => {
      const quantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
      alerts.push({
        severity: quantity >= 500 ? 'critical' : 'medium',
        title: 'Bulk Order Alert',
        description: `Bulk order of ${quantity} items detected`,
        timestamp: order.orderedAt,
        orderId: order._id
      });
    });

    // Sort by severity and timestamp
    alerts.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[b.severity] - severityOrder[a.severity];
      }
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    res.json({
      alerts: alerts.slice(0, 20)
    });

  } catch (error) {
    console.error('Error fetching live alerts:', error);
    res.status(500).json({ error: 'Failed to fetch live alerts' });
  }
});

// Live Statistics Endpoint
router.get('/live-stats', protect, adminOnly, async (req, res) => {
  try {
    const now = new Date();
    const last5Min = new Date(now.getTime() - 5 * 60 * 1000);
    const last1Hour = new Date(now.getTime() - 60 * 60 * 1000);

    // Live orders in last 5 minutes
    const liveOrders = await Order.countDocuments({
      orderedAt: { $gte: last5Min }
    });

    // Active alerts count
    const activeAlerts = await Order.countDocuments({
      orderedAt: { $gte: last1Hour },
      requiresApproval: true
    });

    // Estimate online users (users with activity in last 15 minutes)
    const last15Min = new Date(now.getTime() - 15 * 60 * 1000);
    const onlineUsers = await Order.distinct('uid', {
      orderedAt: { $gte: last15Min }
    }).then(uids => uids.length);

    // Average risk score
    const riskScoreAgg = await Order.aggregate([
      {
        $match: {
          orderedAt: { $gte: last1Hour },
          'securityInfo.riskScore': { $exists: true }
        }
      },
      {
        $group: {
          _id: null,
          avgRiskScore: { $avg: '$securityInfo.riskScore' }
        }
      }
    ]);

    const avgRiskScore = riskScoreAgg[0]?.avgRiskScore || 0;

    res.json({
      stats: {
        liveOrders,
        activeAlerts,
        onlineUsers,
        avgRiskScore: Math.round(avgRiskScore)
      }
    });

  } catch (error) {
    console.error('Error fetching live stats:', error);
    res.status(500).json({ error: 'Failed to fetch live stats' });
  }
});

module.exports = router;
