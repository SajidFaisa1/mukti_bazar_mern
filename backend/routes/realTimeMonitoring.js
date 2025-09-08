const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Product = require('../models/Product');
const Order = require('../models/Order');
const AuditEvent = require('../models/AuditEvent');
const mongoose = require('mongoose');

// Real-time monitoring data
router.get('/monitoring/live-feed', async (req, res) => {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get recent activities from various collections
    const [
      recentUsers,
      recentVendors,
      recentProducts,
      recentOrders,
      auditEvents
    ] = await Promise.all([
      User.find({ createdAt: { $gte: oneHourAgo } })
        .select('firstName lastName email createdAt')
        .sort({ createdAt: -1 })
        .limit(10),
      
      Vendor.find({ createdAt: { $gte: oneHourAgo } })
        .select('businessName email createdAt')
        .sort({ createdAt: -1 })
        .limit(10),
      
      Product.find({ createdAt: { $gte: oneHourAgo } })
        .populate('vendor', 'businessName')
        .select('name vendor createdAt status')
        .sort({ createdAt: -1 })
        .limit(10),
      
      Order.find({ createdAt: { $gte: oneHourAgo } })
        .populate('user', 'firstName lastName')
        .select('user totalAmount status createdAt')
        .sort({ createdAt: -1 })
        .limit(10),
      
      AuditEvent.find({ createdAt: { $gte: oneDayAgo } })
        .populate('adminId', 'username')
        .sort({ createdAt: -1 })
        .limit(20)
    ]);

    // Format activities for the feed
    const activities = [];

    // Add user registrations
    recentUsers.forEach(user => {
      activities.push({
        id: `user_${user._id}`,
        type: 'user_registration',
        message: `New user registered: ${user.firstName} ${user.lastName}`,
        timestamp: user.createdAt,
        severity: 'info',
        data: { userId: user._id, email: user.email }
      });
    });

    // Add vendor registrations
    recentVendors.forEach(vendor => {
      activities.push({
        id: `vendor_${vendor._id}`,
        type: 'vendor_registration',
        message: `New vendor registered: ${vendor.businessName}`,
        timestamp: vendor.createdAt,
        severity: 'info',
        data: { vendorId: vendor._id, email: vendor.email }
      });
    });

    // Add product submissions
    recentProducts.forEach(product => {
      activities.push({
        id: `product_${product._id}`,
        type: 'product_submission',
        message: `New product submitted: ${product.name} by ${product.vendor?.businessName || 'Unknown'}`,
        timestamp: product.createdAt,
        severity: product.status === 'pending' ? 'warning' : 'info',
        data: { productId: product._id, status: product.status }
      });
    });

    // Add new orders
    recentOrders.forEach(order => {
      activities.push({
        id: `order_${order._id}`,
        type: 'new_order',
        message: `New order placed by ${order.user?.firstName || 'Unknown'} - $${order.totalAmount}`,
        timestamp: order.createdAt,
        severity: 'success',
        data: { orderId: order._id, amount: order.totalAmount }
      });
    });

    // Add audit events
    auditEvents.forEach(event => {
      activities.push({
        id: `audit_${event._id}`,
        type: 'admin_action',
        message: `Admin action: ${event.action} by ${event.adminId?.username || 'Unknown'}`,
        timestamp: event.createdAt,
        severity: event.action.includes('BAN') || event.action.includes('DELETE') ? 'error' : 'info',
        data: { action: event.action, adminId: event.adminId }
      });
    });

    // Sort all activities by timestamp
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      activities: activities.slice(0, 50), // Return latest 50 activities
      lastUpdated: new Date()
    });

  } catch (error) {
    console.error('Error fetching live monitoring data:', error);
    res.status(500).json({ message: 'Error fetching monitoring data' });
  }
});

// Get fraud detection alerts
router.get('/monitoring/fraud-alerts', async (req, res) => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Check for suspicious patterns
    const suspiciousActivities = [];

    // 1. Multiple registrations from same IP (would need IP tracking)
    // 2. Rapid product submissions
    const rapidProducts = await Product.aggregate([
      {
        $match: { createdAt: { $gte: oneDayAgo } }
      },
      {
        $group: {
          _id: '$vendor',
          count: { $sum: 1 },
          firstSubmission: { $min: '$createdAt' },
          lastSubmission: { $max: '$createdAt' }
        }
      },
      {
        $match: { count: { $gte: 5 } }
      },
      {
        $lookup: {
          from: 'vendors',
          localField: '_id',
          foreignField: '_id',
          as: 'vendor'
        }
      }
    ]);

    rapidProducts.forEach(item => {
      const timeDiff = (item.lastSubmission - item.firstSubmission) / (1000 * 60 * 60); // hours
      if (timeDiff < 2) { // More than 5 products in 2 hours
        suspiciousActivities.push({
          id: `rapid_product_${item._id}`,
          type: 'rapid_product_submission',
          severity: 'high',
          message: `Vendor ${item.vendor[0]?.businessName || 'Unknown'} submitted ${item.count} products in ${timeDiff.toFixed(1)} hours`,
          timestamp: item.lastSubmission,
          data: { vendorId: item._id, productCount: item.count }
        });
      }
    });

    // 3. Check for duplicate user registrations (same name/phone patterns)
    const duplicateUsers = await User.aggregate([
      {
        $match: { createdAt: { $gte: oneDayAgo } }
      },
      {
        $group: {
          _id: {
            firstName: '$firstName',
            lastName: '$lastName'
          },
          count: { $sum: 1 },
          users: { $push: { id: '$_id', email: '$email', phone: '$phone' } }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]);

    duplicateUsers.forEach(item => {
      suspiciousActivities.push({
        id: `duplicate_user_${item._id.firstName}_${item._id.lastName}`,
        type: 'duplicate_registration',
        severity: 'medium',
        message: `${item.count} users registered with name ${item._id.firstName} ${item._id.lastName}`,
        timestamp: new Date(),
        data: { users: item.users }
      });
    });

    // 4. Check for suspicious pricing (extremely low prices)
    const suspiciousPricing = await Product.find({
      createdAt: { $gte: oneDayAgo },
      unitPrice: { $lt: 10 }, // Products under $10
      category: { $in: ['Electronics', 'Machinery', 'Vehicles'] } // High-value categories
    }).populate('vendor', 'businessName');

    suspiciousPricing.forEach(product => {
      suspiciousActivities.push({
        id: `suspicious_price_${product._id}`,
        type: 'suspicious_pricing',
        severity: 'medium',
        message: `${product.vendor?.businessName || 'Unknown'} listed ${product.name} for $${product.unitPrice}`,
        timestamp: product.createdAt,
        data: { productId: product._id, price: product.unitPrice }
      });
    });

    res.json({
      alerts: suspiciousActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
      summary: {
        total: suspiciousActivities.length,
        high: suspiciousActivities.filter(a => a.severity === 'high').length,
        medium: suspiciousActivities.filter(a => a.severity === 'medium').length,
        low: suspiciousActivities.filter(a => a.severity === 'low').length
      }
    });

  } catch (error) {
    console.error('Error fetching fraud alerts:', error);
    res.status(500).json({ message: 'Error fetching fraud alerts' });
  }
});

// Get system metrics
router.get('/monitoring/metrics', async (req, res) => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalVendors,
      totalProducts,
      totalOrders,
      newUsersToday,
      newVendorsToday,
      newProductsToday,
      newOrdersToday,
      pendingProducts,
      flaggedUsers,
      activeOrdersValue
    ] = await Promise.all([
      User.countDocuments(),
      Vendor.countDocuments(),
      Product.countDocuments(),
      Order.countDocuments(),
      User.countDocuments({ createdAt: { $gte: oneDayAgo } }),
      Vendor.countDocuments({ createdAt: { $gte: oneDayAgo } }),
      Product.countDocuments({ createdAt: { $gte: oneDayAgo } }),
      Order.countDocuments({ createdAt: { $gte: oneDayAgo } }),
      Product.countDocuments({ status: 'pending' }),
      User.countDocuments({ status: 'flagged' }),
      Order.aggregate([
        { $match: { status: { $in: ['pending', 'processing'] } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ])
    ]);

    // Calculate growth rates
    const weeklyUsers = await User.countDocuments({ createdAt: { $gte: oneWeekAgo } });
    const weeklyVendors = await Vendor.countDocuments({ createdAt: { $gte: oneWeekAgo } });

    res.json({
      overview: {
        totalUsers,
        totalVendors,
        totalProducts,
        totalOrders,
        newUsersToday,
        newVendorsToday,
        newProductsToday,
        newOrdersToday
      },
      pending: {
        products: pendingProducts,
        flaggedUsers,
        activeOrdersValue: activeOrdersValue[0]?.total || 0
      },
      growth: {
        usersWeekly: weeklyUsers,
        vendorsWeekly: weeklyVendors,
        userGrowthRate: totalUsers > 0 ? ((weeklyUsers / totalUsers) * 100).toFixed(1) : 0,
        vendorGrowthRate: totalVendors > 0 ? ((weeklyVendors / totalVendors) * 100).toFixed(1) : 0
      },
      systemHealth: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('Error fetching system metrics:', error);
    res.status(500).json({ message: 'Error fetching system metrics' });
  }
});

module.exports = router;
