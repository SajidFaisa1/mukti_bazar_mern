const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const { protect, adminOnly } = require('../middleware/auth');

// 🛡️ ADMIN PANEL - ANTI-SYNDICATE FEATURES

// Get all orders requiring admin approval
router.get('/pending-orders', protect, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20, severity, type } = req.query;
    
    let filter = { requiresApproval: true, 'adminApproval.status': 'pending' };
    
    // Filter by suspicious flag severity
    if (severity) {
      filter['suspiciousFlags.severity'] = severity;
    }
    
    // Filter by suspicious flag type
    if (type) {
      filter['suspiciousFlags.type'] = type;
    }
    
    const orders = await Order.find(filter)
      .populate('user', 'firstName lastName email phone')
      .populate('vendor', 'businessName email phone')
      .sort({ orderedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();
    
    const total = await Order.countDocuments(filter);
    
    // Get fraud statistics
    const fraudStats = await Order.aggregate([
      { $match: { requiresApproval: true } },
      { $unwind: '$suspiciousFlags' },
      { 
        $group: { 
          _id: '$suspiciousFlags.type', 
          count: { $sum: 1 },
          severity: { $first: '$suspiciousFlags.severity' }
        } 
      }
    ]);
    
    res.json({
      orders,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      },
      fraudStats
    });
    
  } catch (error) {
    console.error('Error fetching pending orders:', error);
    res.status(500).json({ error: 'Failed to fetch pending orders' });
  }
});

// Get fraud detection dashboard data
router.get('/fraud-dashboard', protect, adminOnly, async (req, res) => {
  try {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Get suspicious activities in last 24 hours
    const recentSuspicious = await Order.find({
      requiresApproval: true,
      orderedAt: { $gte: last24h }
    }).countDocuments();
    
    // Get IP addresses with multiple orders
    const suspiciousIPs = await Order.aggregate([
      { 
        $match: { 
          orderedAt: { $gte: last7days },
          'securityInfo.ipAddress': { $exists: true }
        } 
      },
      { 
        $group: { 
          _id: '$securityInfo.ipAddress', 
          orderCount: { $sum: 1 },
          totalValue: { $sum: '$total' },
          users: { $addToSet: '$uid' }
        } 
      },
      { $match: { orderCount: { $gt: 10 } } },
      { $sort: { orderCount: -1 } },
      { $limit: 20 }
    ]);
    
    // Get bulk orders (high quantity)
    const bulkOrders = await Order.find({
      'suspiciousFlags.type': 'bulk_hoarding',
      orderedAt: { $gte: last7days }
    })
    .populate('user', 'firstName lastName email')
    .select('orderNumber total itemCount suspiciousFlags orderedAt')
    .sort({ orderedAt: -1 })
    .limit(10);
    
    // Get users with rapid ordering patterns
    const rapidOrderUsers = await Order.aggregate([
      { 
        $match: { 
          orderedAt: { $gte: last24h }
        } 
      },
      { 
        $group: { 
          _id: '$uid', 
          orderCount: { $sum: 1 },
          totalSpent: { $sum: '$total' }
        } 
      },
      { $match: { orderCount: { $gt: 3 } } },
      { $sort: { orderCount: -1 } },
      { $limit: 10 }
    ]);
    
    res.json({
      summary: {
        recentSuspicious,
        totalPending: await Order.countDocuments({ 'adminApproval.status': 'pending' }),
        suspiciousIPCount: suspiciousIPs.length,
        rapidOrderUsers: rapidOrderUsers.length
      },
      suspiciousIPs,
      bulkOrders,
      rapidOrderUsers
    });
    
  } catch (error) {
    console.error('Error fetching fraud dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch fraud dashboard data' });
  }
});

// Approve or reject an order
router.patch('/orders/:orderId/review', protect, adminOnly, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { action, reason, notes } = req.body;
    const adminUid = req.user.id;
    
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be "approve" or "reject"' });
    }
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    if (!order.requiresApproval) {
      return res.status(400).json({ error: 'Order does not require approval' });
    }
    
    // Update admin approval status
    order.adminApproval = {
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewedBy: adminUid,
      reviewedAt: new Date(),
      reason,
      notes
    };
    
    if (action === 'approve') {
      order.requiresApproval = false;
      order.status = 'confirmed';
      await order.updateStatus('confirmed', `Approved by admin: ${reason || 'Security review passed'}`, adminUid);
    } else {
      order.status = 'cancelled';
      await order.updateStatus('cancelled', `Rejected by admin: ${reason || 'Failed security review'}`, adminUid);
      
      // Restore product stock for rejected orders
      await order.restoreStock();
    }
    
    await order.save();
    
    // Log admin action
    console.log(`Admin ${adminUid} ${action}ed order ${order.orderNumber}: ${reason}`);
    
    res.json({ 
      message: `Order ${action}ed successfully`,
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
        adminApproval: order.adminApproval
      }
    });
    
  } catch (error) {
    console.error('Error reviewing order:', error);
    res.status(500).json({ error: 'Failed to review order' });
  }
});

// Get detailed fraud analysis for a specific order
router.get('/orders/:orderId/fraud-analysis', protect, adminOnly, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findById(orderId)
      .populate('user', 'firstName lastName email phone createdAt')
      .populate('vendor', 'businessName email phone');
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Get user's order history
    const userOrderHistory = await Order.find({ uid: order.uid })
      .select('orderNumber total status orderedAt suspiciousFlags')
      .sort({ orderedAt: -1 })
      .limit(20);
    
    // Get orders from same IP
    const ipOrderHistory = order.securityInfo?.ipAddress ? 
      await Order.find({ 'securityInfo.ipAddress': order.securityInfo.ipAddress })
        .select('orderNumber uid total status orderedAt')
        .sort({ orderedAt: -1 })
        .limit(10) : [];
    
    // Calculate risk score
    let riskScore = 0;
    order.suspiciousFlags.forEach(flag => {
      switch (flag.severity) {
        case 'low': riskScore += 10; break;
        case 'medium': riskScore += 25; break;
        case 'high': riskScore += 50; break;
        case 'critical': riskScore += 100; break;
      }
    });
    
    const riskLevel = riskScore < 25 ? 'Low' : 
                     riskScore < 50 ? 'Medium' :
                     riskScore < 100 ? 'High' : 'Critical';
    
    res.json({
      order,
      fraudAnalysis: {
        riskScore,
        riskLevel,
        flagCount: order.suspiciousFlags.length,
        suspiciousFlags: order.suspiciousFlags
      },
      userOrderHistory,
      ipOrderHistory,
      recommendations: generateFraudRecommendations(order, riskScore)
    });
    
  } catch (error) {
    console.error('Error fetching fraud analysis:', error);
    res.status(500).json({ error: 'Failed to fetch fraud analysis' });
  }
});

// Bulk approve/reject multiple orders
router.patch('/orders/bulk-review', protect, adminOnly, async (req, res) => {
  try {
    const { orderIds, action, reason } = req.body;
    const adminUid = req.user.id;
    
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ error: 'Order IDs array is required' });
    }
    
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }
    
    const results = [];
    
    for (const orderId of orderIds) {
      try {
        const order = await Order.findById(orderId);
        if (!order || !order.requiresApproval) {
          results.push({ orderId, status: 'skipped', reason: 'Order not found or doesn\'t require approval' });
          continue;
        }
        
        order.adminApproval = {
          status: action === 'approve' ? 'approved' : 'rejected',
          reviewedBy: adminUid,
          reviewedAt: new Date(),
          reason
        };
        
        if (action === 'approve') {
          order.requiresApproval = false;
          order.status = 'confirmed';
          await order.updateStatus('confirmed', `Bulk approved: ${reason}`, adminUid);
        } else {
          order.status = 'cancelled';
          await order.updateStatus('cancelled', `Bulk rejected: ${reason}`, adminUid);
          await order.restoreStock();
        }
        
        await order.save();
        results.push({ orderId, status: 'success', orderNumber: order.orderNumber });
        
      } catch (error) {
        results.push({ orderId, status: 'error', error: error.message });
      }
    }
    
    res.json({ 
      message: `Bulk ${action} completed`,
      results,
      summary: {
        total: orderIds.length,
        successful: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'error').length,
        skipped: results.filter(r => r.status === 'skipped').length
      }
    });
    
  } catch (error) {
    console.error('Error bulk reviewing orders:', error);
    res.status(500).json({ error: 'Bulk review failed' });
  }
});

// Helper function to generate fraud recommendations
function generateFraudRecommendations(order, riskScore) {
  const recommendations = [];
  
  if (riskScore > 75) {
    recommendations.push('🚨 HIGH RISK: Consider rejecting this order or requiring additional verification');
  }
  
  order.suspiciousFlags.forEach(flag => {
    switch (flag.type) {
      case 'bulk_hoarding':
        recommendations.push('⚠️ Large quantity order detected. Verify buyer legitimacy and business need');
        break;
      case 'high_value':
        recommendations.push('💰 High-value transaction. Consider additional payment verification');
        break;
      case 'rapid_ordering':
        recommendations.push('🏃 Rapid ordering pattern. Check if user is legitimate bulk buyer');
        break;
      case 'multiple_devices':
        recommendations.push('🔄 Multiple devices/IPs used. Possible account sharing or bot activity');
        break;
    }
  });
  
  if (recommendations.length === 0) {
    recommendations.push('✅ Order appears legitimate but requires standard review');
  }
  
  return recommendations;
}

module.exports = router;
