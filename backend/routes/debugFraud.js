const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { protect, adminOnly } = require('../middleware/auth');

// Debug specific order by order number
router.get('/order/:orderNumber', protect, adminOnly, async (req, res) => {
  try {
    const { orderNumber } = req.params;
    
    const order = await Order.findOne({ orderNumber })
      .populate('user', 'firstName lastName email uid')
      .populate('vendor', 'businessName email');
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Get user's order history
    const userOrders = await Order.find({ uid: order.uid })
      .select('orderNumber total itemCount orderedAt suspiciousFlags requiresApproval securityInfo')
      .sort({ orderedAt: -1 })
      .limit(10);
    
    // Check if device fingerprint exists in other orders
    let deviceOrders = [];
    if (order.securityInfo?.deviceFingerprint) {
      deviceOrders = await Order.find({
        'securityInfo.deviceFingerprint': order.securityInfo.deviceFingerprint,
        orderNumber: { $ne: orderNumber }
      })
      .select('orderNumber uid orderedAt securityInfo.ipAddress')
      .limit(10);
    }
    
    // Analyze why this order might not be flagged
    const totalQuantity = order.items?.reduce((total, item) => total + (item.quantity || 0), 0) || order.itemCount || 0;
    const analysis = {
      totalQuantity,
      totalValue: order.total,
      hasDeviceFingerprint: !!order.securityInfo?.deviceFingerprint,
      hasSecurityInfo: !!order.securityInfo,
      flagCount: order.suspiciousFlags?.length || 0,
      requiresApproval: order.requiresApproval,
      userOrderCount: userOrders.length,
      deviceSharedWith: deviceOrders.length,
      
      // Check against current thresholds
      meetsQuantityThreshold: totalQuantity > 20, // Lowered threshold
      meetsValueThreshold: order.total > 15000,   // Lowered threshold
      isRapidOrdering: userOrders.length > 1,     // More sensitive
      
      reasons: []
    };
    
    // Determine why order might not be flagged
    if (!analysis.meetsQuantityThreshold && !analysis.meetsValueThreshold && !analysis.isRapidOrdering) {
      analysis.reasons.push(`Low activity: quantity=${totalQuantity} (>20), value=৳${order.total} (>15k), orders=${userOrders.length} (>1)`);
    }
    if (!analysis.hasDeviceFingerprint) {
      analysis.reasons.push('No device fingerprint captured');
    }
    if (analysis.flagCount === 0) {
      analysis.reasons.push('No suspicious flags detected');
    }
    if (!order.requiresApproval) {
      analysis.reasons.push('Not flagged for admin review');
    }
    
    // Generate recommendations
    const recommendations = [];
    if (!analysis.hasDeviceFingerprint) {
      recommendations.push('🔧 Check device fingerprinting implementation');
    }
    if (totalQuantity > 20 && !order.requiresApproval) {
      recommendations.push('⚠️ Should be flagged for bulk ordering');
    }
    if (order.total > 15000 && !order.requiresApproval) {
      recommendations.push('💰 Should be flagged for high value');
    }
    if (analysis.isRapidOrdering && !order.requiresApproval) {
      recommendations.push('🏃 Should be flagged for rapid ordering');
    }
    
    res.json({
      success: true,
      order: {
        ...order.toJSON(),
        analysis
      },
      userOrders,
      deviceOrders,
      recommendations: recommendations.length > 0 ? recommendations : ['✅ Order appears correctly processed']
    });
    
  } catch (error) {
    console.error('Error debugging order:', error);
    res.status(500).json({ error: 'Failed to debug order' });
  }
});

// Get all recent orders (flagged and unflagged) for comparison
router.get('/recent-orders', protect, adminOnly, async (req, res) => {
  try {
    const { limit = 50, days = 7, includeAll = false } = req.query;
    
    const cutoffDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);
    const baseFilter = { orderedAt: { $gte: cutoffDate } };
    
    if (!includeAll) {
      // Only show orders that should be flagged or are flagged
      baseFilter.$or = [
        { requiresApproval: true },
        { total: { $gt: 15000 } },
        { itemCount: { $gt: 20 } }
      ];
    }
    
    const orders = await Order.find(baseFilter)
      .populate('user', 'firstName lastName email uid')
      .select('orderNumber total itemCount orderedAt suspiciousFlags requiresApproval securityInfo uid items')
      .sort({ orderedAt: -1 })
      .limit(parseInt(limit));
    
    // Process each order for better analysis
    const processedOrders = orders.map(order => {
      const totalQuantity = order.items?.reduce((total, item) => total + (item.quantity || 0), 0) || 0;
      
      return {
        orderNumber: order.orderNumber,
        total: order.total,
        itemCount: order.itemCount || totalQuantity,
        totalQuantity,
        orderedAt: order.orderedAt,
        flagged: order.requiresApproval,
        flagCount: order.suspiciousFlags?.length || 0,
        flagTypes: order.suspiciousFlags?.map(f => f.type) || [],
        hasDevice: !!order.securityInfo?.deviceFingerprint,
        riskLevel: order.securityInfo?.riskLevel || 'unknown',
        customer: order.user ? `${order.user.firstName} ${order.user.lastName}` : 'Unknown',
        uid: order.uid,
        
        // Analysis flags
        shouldBeFlagged: {
          highValue: order.total > 15000,
          bulkQuantity: totalQuantity > 20,
          hasFlags: (order.suspiciousFlags?.length || 0) > 0
        }
      };
    });
    
    // Categorize orders
    const stats = {
      total: processedOrders.length,
      flagged: processedOrders.filter(o => o.flagged).length,
      unflagged: processedOrders.filter(o => !o.flagged).length,
      withDevice: processedOrders.filter(o => o.hasDevice).length,
      withoutDevice: processedOrders.filter(o => !o.hasDevice).length,
      shouldBeFlagged: processedOrders.filter(o => 
        (o.shouldBeFlagged.highValue || o.shouldBeFlagged.bulkQuantity) && !o.flagged
      ).length
    };
    
    res.json({
      success: true,
      stats,
      orders: processedOrders,
      analysis: {
        unflaggedButSuspicious: processedOrders.filter(o => 
          (o.shouldBeFlagged.highValue || o.shouldBeFlagged.bulkQuantity) && !o.flagged
        ).map(o => ({
          orderNumber: o.orderNumber,
          total: o.total,
          quantity: o.totalQuantity,
          reasons: [
            o.shouldBeFlagged.highValue ? 'High value' : null,
            o.shouldBeFlagged.bulkQuantity ? 'Bulk quantity' : null
          ].filter(Boolean)
        }))
      }
    });
    
  } catch (error) {
    console.error('Error fetching recent orders:', error);
    res.status(500).json({ error: 'Failed to fetch recent orders' });
  }
});

// Debug endpoint to check fraud detection for a specific user
router.get('/debug-fraud/:uid', protect, adminOnly, async (req, res) => {
  try {
    const { uid } = req.params;
    
    // Get user's recent orders
    const recentOrders = await Order.find({ uid })
      .sort({ orderedAt: -1 })
      .limit(20)
      .select('orderNumber total itemCount requiresApproval suspiciousFlags orderedAt securityInfo.ipAddress');
    
    // Get fraud statistics
    const totalOrders = await Order.countDocuments({ uid });
    const flaggedOrders = await Order.countDocuments({ uid, requiresApproval: true });
    
    // Check current fraud history
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const orders24h = await Order.find({
      uid,
      orderedAt: { $gte: last24h }
    }).sort({ orderedAt: -1 });

    // Simulate fraud detection
    const mockSecurityInfo = {
      ipAddress: '192.168.1.100',
      deviceFingerprint: 'test-device-123'
    };

    const fraudAnalysis = await Order.checkUserFraudHistory(uid, mockSecurityInfo);

    res.json({
      success: true,
      debug: {
        uid,
        totalOrders,
        flaggedOrders,
        orders24h: orders24h.length,
        recentOrders: recentOrders.map(order => ({
          orderNumber: order.orderNumber,
          total: order.total,
          itemCount: order.itemCount,
          requiresApproval: order.requiresApproval,
          suspiciousFlags: order.suspiciousFlags,
          orderedAt: order.orderedAt,
          ipAddress: order.securityInfo?.ipAddress
        })),
        fraudAnalysis: {
          recentOrdersFound: fraudAnalysis.recentOrders.length,
          flags: fraudAnalysis.flags
        }
      }
    });

  } catch (error) {
    console.error('Debug fraud error:', error);
    res.status(500).json({ error: 'Failed to debug fraud detection' });
  }
});

// Force refresh fraud detection for all pending orders
router.post('/refresh-fraud-detection', protect, adminOnly, async (req, res) => {
  try {
    const pendingOrders = await Order.find({
      requiresApproval: false,
      orderedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    });

    let updatedCount = 0;

    for (const order of pendingOrders) {
      // Re-run fraud detection
      const mockSecurityInfo = {
        ipAddress: order.securityInfo?.ipAddress || '127.0.0.1',
        deviceFingerprint: order.securityInfo?.deviceFingerprint || 'unknown'
      };

      const fraudCheck = await Order.checkUserFraudHistory(order.uid, mockSecurityInfo);
      
      if (fraudCheck.flags.length > 0) {
        order.suspiciousFlags.push(...fraudCheck.flags);
        
        const requiresReview = fraudCheck.flags.some(flag => 
          ['medium', 'high', 'critical'].includes(flag.severity)
        );
        
        if (requiresReview) {
          order.requiresApproval = true;
          order.adminApproval.status = 'pending';
          await order.save();
          updatedCount++;
          
          console.log(`Updated order ${order.orderNumber} with flags:`, 
            fraudCheck.flags.map(f => f.type).join(', ')
          );
        }
      }
    }

    res.json({
      success: true,
      message: `Updated ${updatedCount} orders with fraud detection`,
      updatedCount,
      totalChecked: pendingOrders.length
    });

  } catch (error) {
    console.error('Refresh fraud detection error:', error);
    res.status(500).json({ error: 'Failed to refresh fraud detection' });
  }
});

// Get detailed fraud statistics
router.get('/detailed-stats', protect, adminOnly, async (req, res) => {
  try {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Get all fraud types with counts
    const fraudStats = await Order.aggregate([
      { $match: { requiresApproval: true } },
      { $unwind: '$suspiciousFlags' },
      {
        $group: {
          _id: '$suspiciousFlags.type',
          count: { $sum: 1 },
          severities: { $push: '$suspiciousFlags.severity' },
          avgSeverity: { $avg: {
            $switch: {
              branches: [
                { case: { $eq: ['$suspiciousFlags.severity', 'low'] }, then: 1 },
                { case: { $eq: ['$suspiciousFlags.severity', 'medium'] }, then: 2 },
                { case: { $eq: ['$suspiciousFlags.severity', 'high'] }, then: 3 },
                { case: { $eq: ['$suspiciousFlags.severity', 'critical'] }, then: 4 }
              ],
              default: 2
            }
          }}
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get pending vs approved breakdown
    const approvalStats = await Order.aggregate([
      { $match: { requiresApproval: true } },
      {
        $group: {
          _id: '$adminApproval.status',
          count: { $sum: 1 },
          totalValue: { $sum: '$total' }
        }
      }
    ]);

    // Recent activity
    const recentFlagged = await Order.find({
      requiresApproval: true,
      orderedAt: { $gte: last24h }
    })
    .select('orderNumber uid total suspiciousFlags orderedAt')
    .sort({ orderedAt: -1 })
    .limit(10);

    res.json({
      success: true,
      stats: {
        fraudTypes: fraudStats,
        approvalBreakdown: approvalStats,
        recentActivity: recentFlagged,
        summary: {
          totalFlaggedOrders: await Order.countDocuments({ requiresApproval: true }),
          pendingReview: await Order.countDocuments({ 'adminApproval.status': 'pending' }),
          recentFlags24h: recentFlagged.length
        }
      }
    });

  } catch (error) {
    console.error('Detailed stats error:', error);
    res.status(500).json({ error: 'Failed to get detailed stats' });
  }
});

module.exports = router;
